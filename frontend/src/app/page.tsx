'use client';
import { useState, useEffect } from 'react';
import { useAgentSocket } from '../hooks/useAgentSocket';
import TraceLog from '../components/TraceLog';
import KanbanBoard from '../components/KanbanBoard';
import ControlPanel from '../components/ControlPanel';

export default function Home() {
  const [threadId, setThreadId] = useState<string>('');

  useEffect(() => {
    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    setThreadId(uniqueId);
  }, []);

  const { sendAction } = useAgentSocket(threadId);

  if (!threadId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-500 animate-pulse font-mono text-sm">Initializing secure workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8 flex flex-col font-sans text-gray-100">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Agentic <span className="text-blue-500">PM Orchestrator</span>
        </h1>
        <p className="text-gray-400 mt-1 flex items-center gap-2">
          Multi-Agent System <span className="text-gray-700">|</span> 
          <span className="font-mono text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-1 rounded">Session: {threadId.split('-')[0]}</span>
        </p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-150px)]">
        <div className="flex flex-col gap-6 lg:col-span-1 h-full">
          <ControlPanel sendAction={sendAction} />
          <div className="flex-1 min-h-[300px]">
            <TraceLog />
          </div>
        </div>

        {/* Kanban Workspace Container */}
        <div className="lg:col-span-2 h-full bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800">
          <KanbanBoard />
        </div>
      </div>
    </main>
  );
}