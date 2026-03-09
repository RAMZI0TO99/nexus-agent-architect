import os
import json
import asyncpg
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_huggingface import HuggingFaceEmbeddings
from .state import ProjectState

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
search_tool = TavilySearchResults(max_results=3)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

class TaskSchema(BaseModel):
    id: str = Field(description="Unique ID string")
    title: str = Field(description="Short title")
    description: str = Field(description="Technical details")
    assigned_role: str = Field(description="E.g., Frontend Dev, Data Engineer")

class PlanSchema(BaseModel):
    tasks: List[TaskSchema]

def supervisor_node(state: ProjectState) -> Dict[str, Any]:
    feedback = state.get("human_feedback")
    
    if feedback == "APPROVED":
        return {"next_node": "end"}
    elif feedback:
        # FIX: We no longer delete the feedback here! 
        # We let the planner read it first.
        return {"next_node": "planner"} 
        
    if not state.get("research_notes"):
        return {"next_node": "researcher"}
    elif not state.get("tasks"):
        return {"next_node": "planner"}
    else:
        return {"next_node": "human_review"}

async def memory_retriever_node(state: ProjectState) -> Dict[str, Any]:
    goal = state.get("project_goal", "")
    query_vector = embeddings.embed_query(goal)
    
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    rows = await conn.fetch('''
        SELECT project_goal, approved_tasks 
        FROM company_knowledge_base 
        ORDER BY embedding <=> $1::vector 
        LIMIT 1
    ''', str(query_vector))
    await conn.close()

    if rows:
        past_goal = rows[0]['project_goal']
        past_tasks = rows[0]['approved_tasks']
        return {"research_notes": [f"ARCHIVE RETRIEVAL: We previously built '{past_goal}'. Successful tasks: {past_tasks}"]}
    
    return {"research_notes": ["No similar past projects found in company archive."]}

def researcher_node(state: ProjectState) -> Dict[str, Any]:
    goal = state.get("project_goal", "")
    search_results = search_tool.invoke(goal)
    
    summary_prompt = f"Summarize these search results to help a developer build '{goal}':\n{search_results}"
    summary = llm.invoke([HumanMessage(content=summary_prompt)])
    
    return {
        "research_notes": [summary.content],
        "messages": [AIMessage(content=f"Researched the web for: {goal}", name="Researcher")]
    }

def planner_node(state: ProjectState) -> Dict[str, Any]:
    goal = state.get("project_goal", "")
    research = state.get("research_notes", ["No research."])[-1] 
    feedback = state.get("human_feedback") # It successfully reads the feedback here

    sys_msg = "You are an elite Lead Software Engineer. Break the user's project into 4 highly actionable tasks."
    if feedback:
        sys_msg += f"\n\nCRITICAL: The user rejected your previous plan. Feedback: '{feedback}'. Adjust tasks to satisfy this!"

    prompt = f"Project Goal: {goal}\n\nTechnical Context: {research}"
    structured_llm = llm.with_structured_output(PlanSchema)
    
    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=prompt)
    ])

    task_dicts = [task.model_dump() for task in result.tasks]
    return {
        "tasks": task_dicts,
        "human_feedback": None, # FIX: Delete the feedback HERE after we use it, preventing infinite loops!
        "messages": [AIMessage(content="Drafted structured project tasks.", name="Planner")]
    }

def human_review_node(state: ProjectState) -> Dict[str, Any]:
    pass

async def archiver_node(state: ProjectState) -> Dict[str, Any]:
    goal = state.get("project_goal", "")
    final_tasks = state.get("tasks", [])
    vector = embeddings.embed_query(goal)
    
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    await conn.execute('''
        INSERT INTO company_knowledge_base (project_goal, approved_tasks, embedding)
        VALUES ($1, $2, $3::vector)
    ''', goal, json.dumps(final_tasks), str(vector))
    await conn.close()
    
    return {"messages": [AIMessage(content="Archived to long-term memory.", name="Archiver")]}