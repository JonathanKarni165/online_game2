import React, { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

const my_ip = "192.168.1.241";

export default function Game({ clientId, playerName, playerColor }: { clientId: string, playerName: string, playerColor: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const keys = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    ws.current = new WebSocket(`ws://${my_ip}:8000/ws/${clientId}`);
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'join', name: playerName, color: playerColor }));
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'game') {
        setPlayers(msg.players);
      }
    };
    const sendMove = () => {
      ws.current?.send(JSON.stringify({ type: 'move', ...keys.current }));
    };
    const handleKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = down;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = down;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.current.jump = down;
      sendMove();
    };
    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));
    return () => {
      ws.current?.close();
      window.removeEventListener('keydown', e => handleKey(e, true));
      window.removeEventListener('keyup', e => handleKey(e, false));
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ background: '#222', width: 800, height: 600, margin: '0 auto', position: 'relative' }}>
      <svg width={800} height={600} style={{ position: 'absolute', left: 0, top: 0 }}>
        {/* Floor */}
        <rect x={0} y={520} width={800} height={80} fill="#444" />
        {players.map(p => (
          <g key={p.id}>
            <rect x={p.x} y={p.y} width={40} height={40} fill={p.color} stroke={p.id === clientId ? 'yellow' : 'black'} strokeWidth={p.id === clientId ? 3 : 1} />
            <text x={p.x + 20} y={p.y + 55} fill="white" fontSize={14} textAnchor="middle">{p.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
