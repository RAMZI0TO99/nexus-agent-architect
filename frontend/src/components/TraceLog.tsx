'use client';
import { useAgentStore } from '../store/useAgentStore';
import { Terminal } from 'lucide-react';

export default function TraceLog() {
  const { logs, isConnected } = useAgentStore();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 mb-4 text-gray-400 border-b border-gray-700 pb-2">
        <Terminal size={18} />
        <span>Agent Execution Trace</span>
        <span className={`ml-auto w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.length === 0 && <p className="text-gray-600">Waiting for agent to start...</p>}
        {logs.map((log, index) => (
          <div key={index} className="opacity-90">
            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>{' '}
            {log.content}
          </div>
        ))}
      </div>
    </div>
  );
}