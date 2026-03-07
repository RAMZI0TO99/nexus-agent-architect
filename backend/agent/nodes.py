import os
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from .state import ProjectState
import json
import asyncpg
from langchain_huggingface import HuggingFaceEmbeddings

# 1. Initialize the free, lightning-fast Groq LLM
# We use Llama 3 8B, which is perfect and fast for reasoning tasks
llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

# Initialize free local embeddings (384 dimensions)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# 2. Initialize the AI Web Search Tool
search_tool = TavilySearchResults(max_results=3)

# ==========================================
# DEFINE THE DESIRED JSON OUTPUT STRUCTURE
# ==========================================
class TaskSchema(BaseModel):
    id: str = Field(description="A unique number string, e.g., '1'")
    title: str = Field(description="Short, punchy title of the task")
    description: str = Field(description="Detailed technical explanation of what to do")
    assigned_role: str = Field(description="E.g., 'Frontend Dev', 'Cloud Architect'")

class PlanSchema(BaseModel):
    tasks: List[TaskSchema]

# ==========================================
# AGENT NODES
# ==========================================
def supervisor_node(state: ProjectState) -> Dict[str, Any]:
    """Routes the workflow based on the current state."""
    feedback = state.get("human_feedback")
    
    if feedback == "APPROVED":
        return {"next_node": "end"}
    elif feedback:
        # FIX: Just route to the planner. Do NOT clear the feedback here!
        return {"next_node": "planner"} 
        
    if not state.get("research_notes"):
        return {"next_node": "researcher"}
    elif not state.get("tasks"):
        return {"next_node": "planner"}
    else:
        return {"next_node": "human_review"}

def researcher_node(state: ProjectState) -> Dict[str, Any]:
    """Searches the web and summarizes findings."""
    goal = state.get("project_goal", "")
    
    # 1. Execute the web search
    search_results = search_tool.invoke(goal)
    
    # 2. Ask the LLM to summarize the raw search data
    summary_prompt = f"Summarize these search results to help a developer build the project '{goal}':\n{search_results}"
    summary = llm.invoke([HumanMessage(content=summary_prompt)])
    
    return {
        "research_notes": [summary.content],
        "messages": [AIMessage(content=f"I have researched the web for: {goal}", name="Researcher")]
    }

def planner_node(state: ProjectState) -> Dict[str, Any]:
    """Drafts the final JSON tasks based on research and human feedback."""
    goal = state.get("project_goal", "")
    
    # Get the latest research. If none, provide a fallback.
    research = state.get("research_notes", ["No research available."])[-1] 
    feedback = state.get("human_feedback", "")

    # 1. Give the agent its persona and instructions
    sys_msg = "You are an elite Lead Software Engineer. Break the user's project into 4 highly actionable tasks."
    
    # 2. Inject human feedback if the user requested revisions!
    if feedback:
        sys_msg += f"\n\nCRITICAL: The user rejected your previous plan with this feedback: '{feedback}'. You MUST adjust the tasks to satisfy this feedback!"

    prompt = f"Project Goal: {goal}\n\nTechnical Context from Web: {research}"

    # 3. Force the LLM to output our exact Pydantic JSON structure
    structured_llm = llm.with_structured_output(PlanSchema)
    
    # Generate the plan
    result = structured_llm.invoke([
        SystemMessage(content=sys_msg),
        HumanMessage(content=prompt)
    ])

    # Convert the Pydantic objects back into standard dictionaries for our Graph State
    task_dicts = [task.model_dump() for task in result.tasks]

    return {
        "tasks": task_dicts,
        "human_feedback": None, # FIX: The planner clears the feedback AFTER reading it
        "messages": [AIMessage(content="I have drafted the structured project tasks.", name="Planner")]
    }



async def memory_retriever_node(state: ProjectState) -> Dict[str, Any]:
    """Searches past projects to see if we've done something similar."""
    goal = state.get("project_goal", "")
    
    # 1. Convert the goal into a math vector
    query_vector = embeddings.embed_query(goal)
    
    # 2. Connect to Supabase
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    
    # 3. Perform a cosine similarity search (<=>)
    rows = await conn.fetch('''
        SELECT project_goal, approved_tasks 
        FROM company_knowledge_base 
        ORDER BY embedding <=> $1::vector 
        LIMIT 1
    ''',str(query_vector) )
    
    await conn.close()

    if rows:
        past_goal = rows[0]['project_goal']
        past_tasks = rows[0]['approved_tasks']
        memory_note = f"ARCHIVE RETRIEVAL: We previously built '{past_goal}'. The successful tasks were: {past_tasks}. Use this as a strong template."
        return {"research_notes": [memory_note]}
    
    return {"research_notes": ["No similar past projects found in company archive."]}

async def archiver_node(state: ProjectState) -> Dict[str, Any]:
    """Saves the final, human-approved plan into long-term memory."""
    goal = state.get("project_goal", "")
    final_tasks = state.get("tasks", [])
    
    # Create the embedding
    vector = embeddings.embed_query(goal)
    
    # Insert into Supabase
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    await conn.execute('''
        INSERT INTO company_knowledge_base (project_goal, approved_tasks, embedding)
        VALUES ($1, $2, $3::vector)
    ''', goal, json.dumps(final_tasks), str(vector))
    
    await conn.close()
    
    return {"messages": [AIMessage(content="Project successfully archived to long-term memory.", name="Archiver")]}