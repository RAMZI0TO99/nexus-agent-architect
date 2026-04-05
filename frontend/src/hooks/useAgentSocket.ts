import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';

export const useAgentSocket = (threadId: string) => {
  const ws = useRef<WebSocket | null>(null);
  const { setConnected, setTasks, addLog, setQuota, setWaitingForApproval } = useAgentStore();

  useEffect(() => {
    if (!threadId) return;

    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://127.0.0.1:8000';
    ws.current = new WebSocket(`${url}/ws/agent/${threadId}`);

    ws.current.onopen = () => {
      setConnected(true);
      addLog('System: Secure WebSocket Connected.');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'quota') {
        setQuota(data.used, data.max);
      } else if (data.type === 'error') {
        addLog(`🚨 ERROR: ${data.message}`);
      } else if (data.type === 'status') {
        addLog(`[${data.agent}]: ${data.message}`);
      } else if (data.type === 'update') {
        if (data.tasks) setTasks(data.tasks);
        if (data.logs) data.logs.forEach((log: string) => addLog(log));
      } 
      // --- NEW: Lock & Unlock Logic ---
      else if (data.type === 'waiting_for_user') {
        setWaitingForApproval(true); // Unlock Approve/Revise buttons
        if (data.tasks) setTasks(data.tasks);
        addLog('⏸️ System Paused: Waiting for human approval...');
      } else if (data.type === 'run_complete') {
        setWaitingForApproval(false); // Lock Approve/Revise buttons
        if (data.tasks) setTasks(data.tasks);
        addLog('✅ Run Complete.');
      }
    };

    ws.current.onclose = () => setConnected(false);
    return () => ws.current?.close();
  }, [threadId]);

  const sendAction = (action: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Instantly lock the UI when we send a command to prevent double-clicks
      if (['start', 'approve', 'revise'].includes(action)) {
        setWaitingForApproval(false);
      }
      ws.current.send(JSON.stringify({ action, ...payload }));
    }
  };

  return { sendAction };
};