'use client';
import { useAgentStore } from '../store/useAgentStore';
import { CheckSquare, User } from 'lucide-react';

export default function KanbanBoard() {
  const { tasks } = useAgentStore();

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg text-gray-500 bg-gray-800/30">
        <p>Project tasks will appear here...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-100">
        <CheckSquare className="text-blue-500" /> Drafted Project Plan
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 hover:border-gray-500 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-blue-400 leading-tight pr-2">{task.title}</h3>
              <span className="flex items-center gap-1 text-xs bg-gray-900 border border-gray-700 text-gray-300 px-2 py-1 rounded-full whitespace-nowrap">
                <User size={12} /> {task.assigned_role}
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">{task.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}