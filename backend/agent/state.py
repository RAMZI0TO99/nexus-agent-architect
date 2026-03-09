from typing import Annotated, List, TypedDict, Optional, Any
from langgraph.graph.message import add_messages
import operator

class Task(TypedDict):
    id: str
    title: str
    description: str
    assigned_role: str

class ProjectState(TypedDict):
    messages: Annotated[list, add_messages]
    project_goal: str
    research_notes: Annotated[list, operator.add] 
    tasks: List[Task]
    draft_plan: Optional[str]
    next_node: str 
    human_feedback: Optional[str]