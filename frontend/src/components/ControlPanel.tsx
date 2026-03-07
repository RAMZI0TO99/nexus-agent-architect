'use client';
import { useState } from 'react';
import { useAgentStore } from '../store/useAgentStore';

interface ControlPanelProps {
  sendAction: (action: 'start' | 'approve' | 'revise', payload?: any) => void;
}

export default function ControlPanel({ sendAction }: ControlPanelProps) {
  const [goal, setGoal] = useState('');
  const [feedback, setFeedback] = useState('');
  const { isWaitingForUser, isConnected, clearState } = useAgentStore();

  const handleStart = () => {
    if (!goal.trim()) return;
    clearState();
    sendAction('start', { goal });
    setGoal('');
  };

  const handleApprove = () => {
    sendAction('approve');
  };

  const handleRevise = () => {
    if (!feedback.trim()) return;
    sendAction('revise', { feedback });
    setFeedback('');
  };

  if (!isConnected) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Connecting to Agent Backend... Ensure FastAPI is running!</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      {!isWaitingForUser ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-bold text-gray-800">Start New Project</h3>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="E.g., Build a Python web scraper that extracts real estate listings and saves them to a CSV..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
            rows={3}
          />
          <button
            onClick={handleStart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Generate Agentic Plan
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-l-4 border-orange-500 pl-4">
          <h3 className="font-bold text-orange-600 flex items-center gap-2">
            ⏸️ Agent Paused: Human Review Required
          </h3>
          <p className="text-sm text-gray-600">Review the tasks on the board. You can approve the plan to finish the workflow, or request changes to send it back to the AI Planner.</p>
          
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (e.g., 'Add a task for setting up a PostgreSQL database...')"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none text-black mt-2"
            rows={2}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleRevise}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Approve Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}