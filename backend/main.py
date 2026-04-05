import os
from dotenv import load_dotenv

# CRITICAL: Load variables BEFORE importing any agent logic
load_dotenv() 
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
# Now this import will work because GROQ_API_KEY is in memory
from agent import workflow

import time
from collections import defaultdict

# --- SECURITY: In-Memory Rate Limiter ---
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, client_id: str) -> bool:
        now = time.time()
        self.requests[client_id] = [req_time for req_time in self.requests[client_id] if now - req_time < self.window_seconds]
        
        if len(self.requests[client_id]) >= self.max_requests:
            return False
            
        self.requests[client_id].append(now)
        return True

# 🛑 CRITICAL: Global Rate Limiter (24-Hour Quota)
limiter = RateLimiter(max_requests=3, window_seconds=60)#86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to handle our persistent database connection pool."""
    raw_uri = os.environ.get("DATABASE_URL")
    
    # Strip query parameters that confuse the psycopg driver
    db_uri = raw_uri.split('?')[0] if raw_uri else None
    
    if not db_uri:
        print("❌ Error: DATABASE_URL not found in environment.")
        return

    async with AsyncPostgresSaver.from_conn_string(db_uri) as checkpointer:
        await checkpointer.setup() 
        
        # We compile the graph and store it in app.state
        app.state.agent_app = workflow.compile(
            checkpointer=checkpointer,
            interrupt_before=["human_review"]
        )
        print("✅ Enterprise DB connected. Graph compiled.")
        yield
        print("🛑 Closing DB connections.")

app = FastAPI(title="Agentic PM Orchestrator API", lifespan=lifespan)

# 🛑 NEW: Bulletproof CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "Agentic Backend is Online and routing WebSockets."}

    
@app.websocket("/ws/agent/{thread_id}")
async def agent_websocket(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    
    # Retrieve the COMPILED graph from the app state
    agent_app = websocket.app.state.agent_app
    config = {"configurable": {"thread_id": thread_id}}
    
    print(f"✅ Client {thread_id} connected.")
    
    # --- BROADCAST TRUE QUOTA ---
    now = time.time()
    limiter.requests[thread_id] = [req_time for req_time in limiter.requests[thread_id] if now - req_time < limiter.window_seconds]
    uses_taken = len(limiter.requests[thread_id])
    
    await websocket.send_json({
        "type": "quota",
        "used": uses_taken,
        "max": limiter.max_requests
    })
    
    # --- RESTORE PREVIOUS STATE ---
    try:
        # BUG FIX: Querying agent_app (the compiled engine), NOT workflow (the blueprint)
        snapshot = await agent_app.aget_state(config)
        
        # If they have existing tasks, push them to the frontend immediately
        if snapshot and hasattr(snapshot, 'values') and "tasks" in snapshot.values:
            print(f"🧠 Restoring memory for {thread_id}")
            await websocket.send_json({
                "type": "update",
                "tasks": snapshot.values["tasks"],
                "logs": ["System: Restored previous session state from database."]
            })
    except Exception as e:
        print(f"No previous state found or error loading state: {e}")
        
    # --- WEBSOCKET EVENT LOOP ---
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            # 🛑 FIREWALL: Only deduct tokens for actions that actually generate content
            if action in ["start", "revise"]:
                if not limiter.is_allowed(thread_id):
                    print(f"🚨 RATE LIMIT EXCEEDED FOR SESSION: {thread_id}")
                    await websocket.send_json({
                        "type": "error", 
                        "message": "Security Alert: Daily limit of 3 generations reached. Please upgrade your tier."
                    })
                    continue # Block the request
                # --- NEW: BROADCAST THE UPDATED QUOTA AFTER DEDUCTION ---
                uses_taken = len(limiter.requests[thread_id])
                await websocket.send_json({
                    "type": "quota",
                    "used": uses_taken,
                    "max": limiter.max_requests
                })

            # --- SCENARIO A: Starting a New Project ---
            if action == "start":
                project_goal = payload.get("goal")
                
                # Explicitly wipe the old approval status and old tasks 
                input_state = {
                    "project_goal": project_goal,
                    "messages": [("user", f"Create a project plan for: {project_goal}")],
                    "human_feedback": None,  
                    "tasks": []              
                }
                
                async for event in agent_app.astream_events(input_state, config=config, version="v2"):
                    kind = event["event"]
                    name = event["name"]
                    if kind == "on_chain_start" and name in ["supervisor", "memory_retriever", "researcher", "planner", "archiver"]:
                        await websocket.send_json({"type": "status", "agent": name, "message": f"{name} is working..."})
                
                current_state = await agent_app.aget_state(config)
                
                if current_state.next and current_state.next[0] == "human_review":
                    await websocket.send_json({
                        "type": "waiting_for_user",
                        "tasks": current_state.values.get("tasks", [])
                    })

            # --- SCENARIO B: Human Review (Approve/Revise) ---
            elif action in ["approve", "revise"]:
                feedback = payload.get("feedback", "")
                
                if action == "revise":
                    await agent_app.aupdate_state(config, {"human_feedback": feedback}, as_node="human_review")
                elif action == "approve":
                    await agent_app.aupdate_state(config, {"human_feedback": "APPROVED"}, as_node="human_review")
                
                async for event in agent_app.astream_events(None, config=config, version="v2"):
                    kind = event["event"]
                    name = event["name"]
                    if kind == "on_chain_start" and name in ["supervisor", "memory_retriever", "researcher", "planner", "archiver"]:
                        await websocket.send_json({"type": "status", "agent": name, "message": f"{name} is resuming..."})
                
                final_state = await agent_app.aget_state(config)
                if not final_state.next: 
                    await websocket.send_json({
                        "type": "run_complete",
                        "tasks": final_state.values.get("tasks", [])
                    })
                elif final_state.next[0] == "human_review":
                    await websocket.send_json({
                        "type": "waiting_for_user",
                        "tasks": final_state.values.get("tasks", [])
                    })

    except WebSocketDisconnect:
        print(f"Client {thread_id} disconnected.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        await websocket.send_json({"type": "error", "message": f"Server Error: {str(e)}"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)