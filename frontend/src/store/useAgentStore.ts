import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
}

interface AgentState {
  tasks: Task[];
  logs: string[];
  isConnected: boolean;
  quotaUsed: number;
  quotaMax: number;
  // --- NEW: The AI Pause State ---
  isWaitingForApproval: boolean;
  
  setTasks: (tasks: Task[]) => void;
  addLog: (log: string) => void;
  setConnected: (status: boolean) => void;
  setQuota: (used: number, max: number) => void;
  setWaitingForApproval: (status: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  tasks: [],
  logs: [],
  isConnected: false,
  quotaUsed: 0,
  quotaMax: 3,
  isWaitingForApproval: false,
  
  setTasks: (tasks) => set({ tasks }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setConnected: (status) => set({ isConnected: status }),
  setQuota: (used, max) => set({ quotaUsed: used, quotaMax: max }),
  setWaitingForApproval: (status) => set({ isWaitingForApproval: status }),
}));