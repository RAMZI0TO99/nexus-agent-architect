'use client';
import { useState } from 'react';
import { useAgentStore } from '../store/useAgentStore';

interface ControlPanelProps {
  sendAction: (action: 'start' | 'approve' | 'revise', payload?: any) => void;
}

const MAX_GENERATIONS = 3; 

export default function ControlPanel({ sendAction }: ControlPanelProps) {
  const [goal, setGoal] = useState('');
  const [feedback, setFeedback] = useState('');
  
  const { isWaitingForUser, isConnected, isProcessing, generationCount, clearState } = useAgentStore();
  const isLimitReached = generationCount >= MAX_GENERATIONS;

  const handleStart = () => {
    if (!goal.trim() || isLimitReached || isProcessing) return;
    clearState();
    sendAction('start', { goal });
    setGoal('');
  };

  const handleApprove = () => sendAction('approve');
  
  const handleRevise = () => {
    if (!feedback.trim() || isProcessing) return;
    sendAction('revise', { feedback });
    setFeedback('');
  };

  if (!isConnected) {
    return <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-lg shadow-sm">Connecting to Agent Backend...</div>;
  }

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800">
      {!isWaitingForUser ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-100">Start New Project</h3>
            <span className={`text-xs font-mono px-2 py-1 rounded-full border ${isLimitReached ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-blue-900/30 border-blue-800 text-blue-400'}`}>
              Uses: {generationCount}/{MAX_GENERATIONS}
            </span>
          </div>
          
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isLimitReached || isProcessing}
            placeholder={isLimitReached ? "Portfolio demo limit reached." : "E.g., Build a Python web scraper..."}
            className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-100 placeholder-gray-500"
            rows={3}
          />
          <button
            onClick={handleStart}
            disabled={isLimitReached || isProcessing || !goal.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center shadow-sm"
          >
            {isProcessing ? 'Agent is Orchestrating...' : isLimitReached ? 'Limit Reached' : 'Generate Agentic Plan'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-l-4 border-orange-500 pl-4 bg-orange-900/10 p-3 rounded-r-lg">
          <h3 className="font-bold text-orange-400 flex items-center gap-2">
            ⏸️ Agent Paused: Human Review Required
          </h3>
          <p className="text-sm text-gray-400">Review the tasks on the board. You can approve the plan or request changes.</p>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isProcessing}
            placeholder="Feedback (e.g., 'Use PostgreSQL instead...')"
            className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-gray-100 placeholder-gray-500 mt-2 disabled:bg-gray-900 disabled:text-gray-500 shadow-inner"
            rows={2}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleRevise}
              disabled={isProcessing || !feedback.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
            >
              {isProcessing ? 'Revising...' : 'Request Changes'}
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
            >
              {isProcessing ? 'Finalizing...' : 'Approve Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}