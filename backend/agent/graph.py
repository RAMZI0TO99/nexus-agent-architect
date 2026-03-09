from langgraph.graph import StateGraph, START, END
from .state import ProjectState
from .nodes import supervisor_node, memory_retriever_node, researcher_node, planner_node, human_review_node, archiver_node

workflow = StateGraph(ProjectState)

workflow.add_node("supervisor", supervisor_node)
workflow.add_node("memory_retriever", memory_retriever_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("planner", planner_node)
workflow.add_node("human_review", human_review_node)
workflow.add_node("archiver", archiver_node)

def router(state: ProjectState) -> str:
    next_node = state.get("next_node", END)
    if next_node == "end":
        return "archiver"
    return next_node

workflow.add_edge(START, "memory_retriever")
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
workflow.add_edge("archiver", END)