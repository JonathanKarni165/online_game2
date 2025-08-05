import React, { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

const my_ip = "192.168.1.241";


const Game: React.FC<{ clientId: string, playerName: string, playerColor: string }> = ({ clientId, playerName, playerColor }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const keys = useRef({ left: false, right: false, jump: false });
  const lastSentMask = useRef(0);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws.current = new WebSocket(`${wsProtocol}://${my_ip}:8000/ws/${clientId}`);
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'join', name: playerName, color: playerColor }));
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'game') {
        setPlayers(msg.players);
      }
    };

    // Helper: encode keys as bitmask (left=1, right=2, jump=4)
    const encodeKeys = (k: { left: boolean; right: boolean; jump: boolean }) =>
      (k.left ? 1 : 0) | (k.right ? 2 : 0) | (k.jump ? 4 : 0);

    const sendIfChanged = () => {
      const mask = encodeKeys(keys.current);
      if (mask !== lastSentMask.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'move', mask }));
        lastSentMask.current = mask;
      }
    };

    // Desktop: Keyboard controls
    const handleKey = (e: KeyboardEvent, down: boolean) => {
      let changed = false;
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && keys.current.left !== down) {
        keys.current.left = down; changed = true;
      }
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && keys.current.right !== down) {
        keys.current.right = down; changed = true;
      }
      if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && keys.current.jump !== down) {
        keys.current.jump = down; changed = true;
      }
      if (changed) sendIfChanged();
    };

    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));

    // Mobile: Device orientation for left/right, tap for jump
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // gamma: left/right tilt, negative = left, positive = right
      let left = false, right = false;
      if (e.gamma !== null) {
        if (e.gamma < -10) left = true;
        if (e.gamma > 10) right = true;
      }
      let changed = false;
      if (keys.current.left !== left) { keys.current.left = left; changed = true; }
      if (keys.current.right !== right) { keys.current.right = right; changed = true; }
      // Don't change jump here
      if (changed) sendIfChanged();
    };

    const handleTap = () => {
      if (!keys.current.jump) {
        keys.current.jump = true;
        sendIfChanged();
        setTimeout(() => {
          keys.current.jump = false;
          sendIfChanged();
        }, 150); // short jump pulse
      }
    };

    // Device orientation permission (iOS/Android)
    let orientationListenerAdded = false;
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-ignore
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission().catch(() => {
        // Show a button to the user to request permission
        const btn = document.createElement('button');
        btn.innerText = 'Enable Tilt Controls';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.left = '10px';
        btn.style.zIndex = '1000';
        btn.onclick = () => {
          // @ts-ignore
          DeviceOrientationEvent.requestPermission().then((response) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
              orientationListenerAdded = true;
              btn.remove();
            }
          });
        };
        document.body.appendChild(btn);
      });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
      orientationListenerAdded = true;
    }
    window.addEventListener('touchstart', handleTap);

    return () => {
      ws.current?.close();
      window.removeEventListener('keydown', e => handleKey(e, true));
      window.removeEventListener('keyup', e => handleKey(e, false));
      if (orientationListenerAdded) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      window.removeEventListener('touchstart', handleTap);
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

export default Game;
