from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from .state import ProjectState
from .nodes import supervisor_node, researcher_node, planner_node
from typing import Dict, Any
from .nodes import supervisor_node, researcher_node, planner_node, memory_retriever_node, archiver_node


# 1. A dummy node for the Human-in-the-Loop pause
def human_review_node(state: ProjectState) -> Dict[str, Any]:
    """
    This node does nothing itself! 
    We tell LangGraph to interrupt *before* this node runs.
    When the user approves/revises via the frontend, the graph resumes here.
    """
    pass

# 2. Initialize the Graph with our strict State schema
workflow = StateGraph(ProjectState)

# 3. Add all the Nodes 
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("memory_retriever", memory_retriever_node) # NEW
workflow.add_node("researcher", researcher_node)
workflow.add_node("planner", planner_node)
workflow.add_node("human_review", human_review_node)
workflow.add_node("archiver", archiver_node) # NEW

# 4. Define the Router Logic
def router(state: ProjectState) -> str:
    next_node = state.get("next_node", END)
    if next_node == "end":
        return "archiver" # If approved, go to archiver before ending!
    return next_node

# 5. Wire the Edges
workflow.add_edge(START, "memory_retriever") # Start by checking memory FIRST
workflow.add_edge("memory_retriever", "supervisor")

workflow.add_conditional_edges(
    "supervisor", 
    router, 
    {
        "researcher": "researcher",
        "planner": "planner",
        "human_review": "human_review",
        "archiver": "archiver"
    }
)

workflow.add_edge("researcher", "supervisor")
workflow.add_edge("planner", "supervisor")
workflow.add_edge("human_review", "supervisor")
workflow.add_edge("archiver", END) # End the graph after archiving

# 6. Compile with a Checkpointer (CRITICAL for Human-in-the-Loop)
# MemorySaver saves the graph state locally in RAM (we'd use Postgres for production)
checkpointer = MemorySaver()

# Compile the graph and tell it to pause before the human review
app = workflow.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_review"]
)