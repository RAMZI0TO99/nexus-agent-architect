'use client';

import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { useAgentSocket } from '../hooks/useAgentSocket';
import TraceLog from '../components/TraceLog';
import KanbanBoard from '../components/KanbanBoard';
import ControlPanel from '../components/ControlPanel';

// ==========================================
// 1. THE ISOLATED WORKSPACE COMPONENT
// This only renders when we have a guaranteed User ID.
// This completely kills the "Ghost ID" bug.
// ==========================================
function AgentWorkspace({ userId }: { userId: string }) {
  // Now the socket will ONLY connect using your permanent Clerk ID
  const { sendAction } = useAgentSocket(userId);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden animate-in fade-in duration-500">
      <section className="lg:col-span-4 flex flex-col gap-6 h-full min-h-[500px]">
        <div className="flex-shrink-0">
          <ControlPanel sendAction={sendAction} />
        </div>
        <div className="flex-1 min-h-0">
          <TraceLog />
        </div>
      </section>

      <section className="lg:col-span-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          <KanbanBoard />
        </div>
      </section>
    </div>
  );
}

// ==========================================
// 2. THE MAIN LAYOUT & AUTH GATEWAY
// ==========================================
export default function Home() {
  const { user, isLoaded } = useUser();

  // 1. LOADING STATE
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-mono text-sm animate-pulse">Establishing Secure Identity...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 md:p-8 flex flex-col font-sans text-gray-100 selection:bg-blue-500/30">
      
      {/* HEADER SECTION */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tighter">
            Nexus <span className="text-blue-500">Agent Architect</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-gray-400 text-sm font-medium">Production Node v1.0.4</p>
            
            {user && (
              <>
                <span className="text-gray-700">|</span>
                <span className="font-mono text-[10px] bg-gray-900 text-blue-400 border border-gray-800 px-2 py-0.5 rounded tracking-widest uppercase">
                  ID: {user.id.slice(-8)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* AUTHENTICATION TRIGGER */}
        <div className="flex items-center gap-4">
          {!user ? (
            <SignInButton>
              <button className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg shadow-white/5">
                Access Workspace
              </button>
            </SignInButton>
          ) : (
            <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-1.5 pl-4 rounded-full">
              <span className="text-xs font-semibold text-gray-400 hidden sm:inline">
                Welcome, {user.firstName || 'Operator'}
              </span>
              <UserButton 
                appearance={{
                  elements: { avatarBox: "w-9 h-9 border border-gray-700 hover:border-blue-500 transition-colors" }
                }} 
              />
            </div>
          )}
        </div>
      </header>

      <hr className="border-gray-900 mb-8" />

      {/* CONDITIONAL RENDERING: Gateway vs. Workspace */}
      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 mb-4">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Restricted Workspace</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Please authenticate to access the LangGraph multi-agent orchestrator. 
          </p>
        </div>
      ) : (
        // BOOM: We only mount the socket code here, passing the permanent Clerk ID
        <AgentWorkspace userId={user.id} />
      )}

      {/* FOOTER */}
      <footer className="mt-8 pt-4 border-t border-gray-900 flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-600 font-mono">
        <div>System Status: Operational</div>
        <div>Engine: LangGraph v0.2 / Llama 3.3 70B</div>
      </footer>

    </main>
  );
}