import { create } from 'zustand';

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
  isProcessing: boolean; 
  generationCount: number; 
  logs: Log[];
  tasks: Task[];
  
  setConnected: (status: boolean) => void;
  setWaiting: (status: boolean) => void;
  setProcessing: (status: boolean) => void; 
  incrementGeneration: () => void; 
  addLog: (log: Log) => void;
  setTasks: (tasks: Task[]) => void;
  clearState: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  isConnected: false,
  isWaitingForUser: false,
  isProcessing: false,
  generationCount: 0,
  logs: [],
  tasks: [],
  
  setConnected: (status) => set({ isConnected: status }),
  setWaiting: (status) => set({ isWaitingForUser: status }),
  setProcessing: (status) => set({ isProcessing: status }),
  incrementGeneration: () => set((state) => ({ generationCount: state.generationCount + 1 })),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setTasks: (tasks) => set({ tasks }),
  clearState: () => set({ logs: [], tasks: [], isWaitingForUser: false, isProcessing: false })
}));