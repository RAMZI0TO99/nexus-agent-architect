'use client';
import { useAgentStore } from '../store/useAgentStore';
import { CheckSquare, User } from 'lucide-react';

export default function KanbanBoard() {
  const { tasks } = useAgentStore();

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
        <p>Project tasks will appear here...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <CheckSquare /> Drafted Project Plan
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg text-blue-700">{task.title}</h3>
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                <User size={12} /> {task.assigned_role}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{task.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}