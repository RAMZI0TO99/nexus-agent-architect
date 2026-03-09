import os
from dotenv import load_dotenv

# CRITICAL: Load variables BEFORE importing any agent logic
load_dotenv() 

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json
from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
# Now this import will work because GROQ_API_KEY is in memory
from agent import workflow

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to handle our persistent database connection pool."""
    raw_uri = os.environ.get("DATABASE_URL")
    
    # Strip query parameters that confuse the psycopg driver
    db_uri = raw_uri.split('?')[0] if raw_uri else None
    
    if not db_uri:
        print("❌ Error: DATABASE_URL not found in environment.")
        return

    # FIXED: Add prepare_threshold=None to disable prepared statements for the transaction pooler
    async with AsyncPostgresSaver.from_conn_string(db_uri) as checkpointer:
        await checkpointer.setup() 
        
        app.state.agent_app = workflow.compile(
            checkpointer=checkpointer,
            interrupt_before=["human_review"]
        )
        print("✅ Enterprise DB connected. Graph compiled.")
        yield
        print("🛑 Closing DB connections.")

app = FastAPI(title="Agentic PM Orchestrator API", lifespan=lifespan)


@app.get("/")
async def health_check():
    return {"status": "Agentic Backend is Online and routing WebSockets."}

    
@app.websocket("/ws/agent/{thread_id}")
async def agent_websocket(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    
    agent_app = websocket.app.state.agent_app
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            # --- SCENARIO A: Starting a New Project ---
            if action == "start":
                project_goal = payload.get("goal")
                
                # FIX: Explicitly wipe the old approval status and old tasks 
                # so the database memory doesn't fast-forward the new run!
                input_state = {
                    "project_goal": project_goal,
                    "messages": [("user", f"Create a project plan for: {project_goal}")],
                    "human_feedback": None,  # Clears the previous "APPROVED"
                    "tasks": []              # Clears the previous Kanban board
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
        await websocket.send_json({"type": "error", "message": str(e)})

if __name__ == "__main__":
    # Uses dynamic port for Railway deployment, 8000 locally
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)