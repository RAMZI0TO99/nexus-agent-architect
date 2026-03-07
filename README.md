🧠 Agentic PM Orchestrator: Enterprise Multi-Agent System
An enterprise-grade, event-driven multi-agent system designed to translate high-level project goals into highly structured, actionable execution plans.

Unlike standard LLM wrappers, this system implements a Supervisor-Worker architecture with Human-in-the-Loop (HITL) interrupts and Agentic RAG (Long-Term Memory) to ensure deterministic, safe, and self-improving task orchestration.

🚀 System Architecture & Key Features
Hierarchical Agent Orchestration: Utilizes LangGraph to build a state machine where a Supervisor agent routes tasks dynamically to specialized workers (Researcher and Planner) based on real-time graph state.

Human-in-the-Loop (HITL) Control Flow: Graph execution intentionally halts before finalizing plans, saving its state via a checkpointer. This allows users to review, inject feedback, and force the AI to revise its strategy before approval.

Real-Time Trace Observability: Replaces standard REST requests with asynchronous FastAPI WebSockets (astream_events). The Next.js frontend streams agent thought processes, tool uses, and state transitions with zero-latency.

Vector-Based Long-Term Memory: Integrates PostgreSQL (pgvector) via Supabase. Approved project architectures are embedded and archived. When new projects are initiated, the system queries this database to retrieve and utilize successful historical templates.

Strict Structured Outputs: Enforces robust JSON schemas using Pydantic, ensuring the Next.js Kanban workspace never breaks due to LLM hallucinations.

🛠️ The Tech Stack
🕹️ UI / UX Components
The Mission Control Panel: Initiates projects and handles HITL feedback loops.

The Live Trace Terminal: A real-time observability window into the multi-agent system's inner monologue and tool execution.

The Interactive Workspace: A dynamic Kanban board populated automatically by the Planner agent's validated JSON outputs.

💻 Local Development Setup
To run this full-stack architecture locally, you will need two API keys:

 (Free LLM Inference)

 (Free AI Web Search)

A Supabase PostgreSQL connection string.

1. Clone the repository

2. Configure Environment Variables
Create a .env file in the root directory:

3. Boot the Backend (FastAPI + LangGraph)

4. Boot the Frontend (Next.js)
Open a new terminal:

Navigate to http://localhost:3000 to interact with the system.