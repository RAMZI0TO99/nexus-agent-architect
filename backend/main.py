import os
from dotenv import load_dotenv, find_dotenv

# 1. Automatically find and load the .env file BEFORE anything else happens
load_dotenv(find_dotenv())

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json
import asyncio

# Import our compiled LangGraph workflow
from agent import agent_app

app = FastAPI(title="Agentic PM Orchestrator API")
@app.get("/")
@app.head("/") # Add this line so Codespaces stops complaining!
async def root():
    return {"message": "Backend is running!"}

async def health_check():
    return {"status": "Agent Backend is Online", "endpoint": "/ws/agent/{thread_id}"}


@app.websocket("/ws/agent/{thread_id}")
async def agent_websocket(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    
    # The config dict tells LangGraph which memory thread to use
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        while True:
            # 1. Wait for a message from the Next.js frontend
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            action = payload.get("action")
            
            # --- SCENARIO A: Starting a New Project ---
            if action == "start":
                project_goal = payload.get("goal")
                
                # Initialize the state
                input_state = {
                    "project_goal": project_goal,
                    "messages": [("user", f"Create a project plan for: {project_goal}")]
                }
                
                # Stream the execution events
                async for event in agent_app.astream_events(input_state, config=config, version="v2"):
                    kind = event["event"]
                    name = event["name"]
                    
                    if kind == "on_chain_start" and name in ["supervisor", "researcher", "planner"]:
                        await websocket.send_json({"type": "status", "agent": name, "message": f"{name} is working..."})
                
                # After streaming, check where the graph paused
                current_state = agent_app.get_state(config)
                
                if current_state.next and current_state.next[0] == "human_review":
                    await websocket.send_json({
                        "type": "waiting_for_user",
                        "tasks": current_state.values.get("tasks", [])
                    })

            # --- SCENARIO B: Human-in-the-Loop Feedback ---
            elif action in ["approve", "revise"]:
                feedback = payload.get("feedback", "")
                
                try:
                    if action == "revise":
                        # Inject user feedback into the state
                        agent_app.update_state(config, {"human_feedback": feedback}, as_node="human_review")
                    elif action == "approve":
                        # Approve and move forward
                        agent_app.update_state(config, {"human_feedback": "APPROVED"}, as_node="human_review")
                    
                    # Resume the graph by passing None as the input
                    async for event in agent_app.astream_events(None, config=config, version="v2"):
                        kind = event["event"]
                        name = event["name"]
                        
                        if kind == "on_chain_start" and name in ["supervisor", "researcher", "planner", "archiver"]:
                            await websocket.send_json({"type": "status", "agent": name, "message": f"⚡ {name.upper()} is executing..."})
                    
                    # Check final state after resumption
                    final_state = agent_app.get_state(config)
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
                        
                except Exception as ai_error:
                    # If the AI crashes (e.g., bad JSON), send the error to the frontend Trace Log!
                    print(f"AI Execution Error: {ai_error}")
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Agent Error: {str(ai_error)}"
                    })
    except WebSocketDisconnect:
        print(f"Client {thread_id} disconnected.")
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)