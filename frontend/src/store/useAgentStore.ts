import { create } from 'zustand';

// Define the exact shape of our Task from the LangGraph backend
export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_role: string;
}

export interface Log {
  type: 'status' | 'tool' | 'token';
  content: string;
}

interface AgentState {
  isConnected: boolean;
  isWaitingForUser: boolean;
  logs: Log[];
  tasks: Task[];
  
  // Actions to update the state
  setConnected: (status: boolean) => void;
  setWaiting: (status: boolean) => void;
  addLog: (log: Log) => void;
  setTasks: (tasks: Task[]) => void;
  clearState: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  isConnected: false,
  isWaitingForUser: false,
  logs: [],
  tasks: [],
  
  setConnected: (status) => set({ isConnected: status }),
  setWaiting: (status) => set({ isWaitingForUser: status }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setTasks: (tasks) => set({ tasks: tasks }),
  clearState: () => set({ logs: [], tasks: [], isWaitingForUser: false })
}));