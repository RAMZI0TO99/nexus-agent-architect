'use client';

import { useState } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { Play, RefreshCw, CheckCircle, Activity, ShieldAlert } from 'lucide-react';

interface ControlPanelProps {
  sendAction: (action: string, payload: any) => void;
}

export default function ControlPanel({ sendAction }: ControlPanelProps) {
  const [goal, setGoal] = useState('');
  const [feedback, setFeedback] = useState('');
  
  // Pull the live connection status, Quota stats, and Approval lock
  const { isConnected, quotaUsed, quotaMax, isWaitingForApproval } = useAgentStore();

  // Boolean flags for strict UI locking
  const isQuotaMaxed = quotaUsed >= quotaMax;
  const isLocked = !isConnected || isQuotaMaxed;

  const handleStart = () => {
    if (!goal.trim() || isLocked) return;
    sendAction('start', { goal });
    setGoal(''); // Clear input after sending
  };

  const handleRevise = () => {
    if (!feedback.trim() || isLocked || !isWaitingForApproval) return;
    sendAction('revise', { feedback });
    setFeedback(''); // Clear input after sending
  };

  const handleApprove = () => {
    // Approve doesn't cost a quota token, so we only check if connected & waiting
    if (!isConnected || !isWaitingForApproval) return;
    sendAction('approve', { feedback: "APPROVED" });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden relative">
      
      {/* --- HEADER & QUOTA DISPLAY --- */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Command Center
        </h2>
        
        {/* Dynamic Quota Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-2 transition-colors ${
          isQuotaMaxed 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}>
          {isQuotaMaxed ? <ShieldAlert className="w-3 h-3" /> : null}
          <span>Daily Quota: {quotaUsed}/{quotaMax}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-6 overflow-y-auto">
        
        {/* --- SCENARIO A: NEW PROJECT --- */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Initialize New Architecture
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isLocked}
            placeholder={isQuotaMaxed ? "Daily quota exceeded." : "E.g., Build a scalable Next.js and Python SaaS..."}
            className="w-full h-24 bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleStart}
            disabled={!goal.trim() || isLocked}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            Generate Agentic Plan
          </button>
        </div>

        <hr className="border-gray-800" />

        {/* --- SCENARIO B: HUMAN REVIEW --- */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Human-in-the-Loop Review
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isLocked || !isWaitingForApproval}
            placeholder={
              isQuotaMaxed 
                ? "Daily quota exceeded." 
                : !isWaitingForApproval 
                  ? "Waiting for AI to pause for review..." 
                  : "Request changes to the generated tasks..."
            }
            className="w-full h-16 bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <div className="flex gap-3">
            <button
              onClick={handleRevise}
              disabled={!feedback.trim() || isLocked || !isWaitingForApproval}
              className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Revise
            </button>
            <button
              onClick={handleApprove}
              disabled={!isConnected || !isWaitingForApproval} 
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          </div>
        </div>

      </div>

      {/* --- OFFLINE OVERLAY --- */}
      {!isConnected && (
        <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-gray-300">Backend Disconnected</span>
          </div>
        </div>
      )}
    </div>
  );
}