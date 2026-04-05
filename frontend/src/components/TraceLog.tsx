'use client';
import { useAgentStore } from '../store/useAgentStore';
import { useEffect, useRef } from 'react';

export default function TraceLog() {
  const { logs } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black border border-gray-800 rounded-2xl shadow-xl h-full flex flex-col overflow-hidden font-mono text-xs">
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center text-gray-500 uppercase tracking-widest text-[10px] font-bold">
        <span>System Trace Log</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
          <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-2 text-gray-400">
        {logs.length === 0 ? (
          <p className="text-gray-600 italic">Waiting for system initialization...</p>
        ) : (
          logs.map((log, i) => {
            // Dynamic text coloring based on backend event types
            let textColorClass = 'text-gray-400';
            if (log.includes('🚨')) textColorClass = 'text-red-400';
            else if (log.includes('✅')) textColorClass = 'text-green-400';
            else if (log.includes('⏸️')) textColorClass = 'text-orange-400';
            else if (log.includes('System:')) textColorClass = 'text-blue-400';

            return (
              <div key={i} className={textColorClass}>
                <span className="text-gray-600 mr-2">{'>'}</span> {log}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}