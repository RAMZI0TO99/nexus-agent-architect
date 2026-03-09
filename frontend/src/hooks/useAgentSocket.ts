import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';

export const useAgentSocket = (threadId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const { setConnected, setWaiting, setProcessing, incrementGeneration, addLog, setTasks } = useAgentStore();

  useEffect(() => {
    if (!threadId) return;

    // Grab the URL from env, or default to local
    const rawUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://psychic-xylophone-pjpqjq9pg9qphv55-8000.app.github.dev/';
    
    // 1. Strip any accidental trailing slashes from the env variable
    // 2. Strip '/ws/agent' if you accidentally included it in the env variable
    let cleanBaseUrl = rawUrl.replace(/\/$/, "").replace(/\/ws\/agent$/, "");
    
    // Construct the perfect URL
    const wsUrl = `${cleanBaseUrl}/ws/agent/${threadId}`;
    
    console.log("🔌 Attempting WebSocket connection to:", wsUrl);

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
          setProcessing(false);
          if (data.tasks) setTasks(data.tasks);
          addLog({ type: 'status', content: '⏸️ Agent paused. Awaiting human review.' });
          break;
        case 'run_complete':
          setWaiting(false);
          setProcessing(false);
          if (data.tasks) setTasks(data.tasks);
          addLog({ type: 'status', content: '✅ Workflow complete!' });
          break;
        case 'error':
          setProcessing(false);
          addLog({ type: 'status', content: `❌ Error: ${data.message}` });
          break;
      }
    };

    return () => ws.close();
  }, [threadId, setConnected, setWaiting, setProcessing, addLog, setTasks]);

  const sendAction = (action: 'start' | 'approve' | 'revise', payload: any = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setProcessing(true);
      if (action === 'start') incrementGeneration(); 
      socketRef.current.send(JSON.stringify({ action, ...payload }));
    }
  };

  return { sendAction };
};