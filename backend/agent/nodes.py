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
    feedback = state.get("human_feedback")

    # --- THE AGGRESSIVE FIX ---
    sys_msg = (
        "You are an elite Principal Systems Architect. Your goal is to provide a granular, "
        "low-level implementation plan. \n\n"
        "STEPS TO FOLLOW:\n"
        "1. Identify every unique architectural component (Database, Auth, Cache, Message Broker, UI, DevOps).\n"
        "2. For EACH component, generate 2-4 granular, technical tasks.\n"
        "3. Ensure complex projects (High Availability, Microservices) result in 15-25+ tasks.\n"
        "4. Avoid vague tasks like 'Implement Redis'. Instead use 'Configure Redis Master-Slave Replication and Cache Eviction Policy'.\n"
        "5. If a task is too big to be finished in one day, BREAK IT DOWN."
    )
    
    if feedback:
        sys_msg += f"\n\nCRITICAL REVISION: The user provided feedback: '{feedback}'. You must pivot the entire architecture to address this."

    # Use a higher temperature (0.7) for the planner if possible to encourage more detail
    structured_llm = llm.with_structured_output(PlanSchema)
    
    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=f"Project: {goal}\nContext: {research}")
    ])

    return {
        "tasks": [t.model_dump() for t in result.tasks],
        "human_feedback": None,
        "messages": [AIMessage(content=f"Decomposed project into {len(result.tasks)} granular tasks.", name="Planner")]
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