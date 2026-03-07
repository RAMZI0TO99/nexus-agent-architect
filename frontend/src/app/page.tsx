'use client';
import { useState, useEffect } from 'react';
import { useAgentSocket } from '../hooks/useAgentSocket';
import TraceLog from '../components/TraceLog';
import KanbanBoard from '../components/KanbanBoard';
import ControlPanel from '../components/ControlPanel';

export default function Home() {
  // 1. Initialize state as an empty string so the server renders nothing
  const [threadId, setThreadId] = useState<string>('');

  // 2. Generate the random ID *only* in the browser after the first render
  useEffect(() => {
    const randomId = `project-${Math.random().toString(36).substring(2, 10)}`;
    setThreadId(randomId);
  }, []);

  // 3. Fallback to prevent our WebSocket from trying to connect with an empty ID
  const { sendAction } = useAgentSocket(threadId || 'loading');

  // 4. Don't render the UI until the client has generated the ID
  if (!threadId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Initializing agent workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Agentic <span className="text-blue-600">PM Orchestrator</span>
        </h1>
        {/* The ID will now safely render without hydration mismatches */}
        <p className="text-gray-500 mt-1">Session ID: {threadId}</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-150px)]">
        <div className="flex flex-col gap-6 lg:col-span-1 h-full">
          <ControlPanel sendAction={sendAction} />
          <div className="flex-1 min-h-[300px]">
            <TraceLog />
          </div>
        </div>

        <div className="lg:col-span-2 h-full bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <KanbanBoard />
        </div>
      </div>
    </main>
  );
}