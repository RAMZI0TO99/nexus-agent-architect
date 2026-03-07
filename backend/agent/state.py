from typing import Annotated, List, TypedDict, Optional, Any
from langgraph.graph.message import add_messages
import operator

class Task(TypedDict):
    id: str
    title: str
    description: str
    assigned_role: str

class ProjectState(TypedDict):
    # Tracks the conversation history and agent outputs
    messages: Annotated[list, add_messages]
    
    # User Input
    project_goal: str
    
    # Agent Outputs
    research_notes: Annotated[list, operator.add] # Appends items instead of overwriting
    tasks: List[Task]
    draft_plan: Optional[str]
    
    # Control Flow variables
    next_node: str 
    human_feedback: Optional[str]