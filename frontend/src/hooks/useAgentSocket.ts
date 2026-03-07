import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';

export const useAgentSocket = (threadId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const { setConnected, setWaiting, addLog, setTasks } = useAgentStore();

  useEffect(() => {
    // Connect to the FastAPI server running on port 8000
    // Note: GitHub Codespaces forwards this port automatically
    const wsUrl = `https://psychic-xylophone-pjpqjq9pg9qphv55-8000.app.github.dev/ws/agent/${threadId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          addLog({ type: 'status', content: data.message });
          break;
        case 'waiting_for_user':
          setWaiting(true);
          if (data.tasks) setTasks(data.tasks);
          addLog({ type: 'status', content: '⏸️ Agent paused. Awaiting human review.' });
          break;
        case 'run_complete':
          setWaiting(false);
          if (data.tasks) setTasks(data.tasks);
          addLog({ type: 'status', content: '✅ Workflow complete!' });
          break;
        case 'error':
          addLog({ type: 'status', content: `❌ Error: ${data.message}` });
          break;
      }
    };

    // Cleanup the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, [threadId, setConnected, setWaiting, addLog, setTasks]);

  // Expose a helper function to send actions back to the AI
  const sendAction = (action: 'start' | 'approve' | 'revise', payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, ...payload }));
    } else {
      console.error("WebSocket is not connected!");
    }
  };

  return { sendAction };
};