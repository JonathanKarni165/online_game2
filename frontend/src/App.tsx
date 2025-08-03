import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import Game from './Game';

interface Player {
  id: string;
  name: string;
  color: string;
}

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#ff0000');
  const [clientId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [players, setPlayers] = useState<Player[]>([]);
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!joined) return;
    ws.current = new WebSocket(`ws://localhost:8000/ws/${clientId}`);
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'join', name: playerName, color: playerColor }));
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'lobby') {
        setPlayers(msg.players);
      }
      if (msg.type === 'start') {
        setGameStarted(true);
      }
    };
    return () => {
      ws.current?.close();
    };
    // eslint-disable-next-line
  }, [joined]);

  if (!joined) {
    return (
      <div className="start-menu">
        <h1>Lobby</h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
        />
        <input
          type="color"
          value={playerColor}
          onChange={e => setPlayerColor(e.target.value)}
        />
        <button onClick={() => setJoined(true)} disabled={!playerName}>
          Join Lobby
        </button>
      </div>
    );
  }

  if (gameStarted) {
    return <Game clientId={clientId} playerName={playerName} playerColor={playerColor} />;
  }

  return (
    <div className="lobby">
      <h2>Players in Lobby:</h2>
      <ul>
        {players.map(p => (
          <li key={p.id}>
            <span style={{ color: p.color, fontWeight: p.id === clientId ? 'bold' : undefined }}>
              {p.name} {p.id === clientId ? '(You)' : ''}
            </span>
          </li>
        ))}
      </ul>
      {!gameStarted ? (
        <button onClick={() => ws.current?.send(JSON.stringify({ type: 'start' }))}>
          Start Game
        </button>
      ) : (
        <div style={{ color: 'green', fontWeight: 'bold' }}>Game Started!</div>
      )}
      <button onClick={() => {
        ws.current?.send(JSON.stringify({ type: 'leave' }));
        setJoined(false);
        setGameStarted(false);
      }}>Leave Lobby</button>
    </div>
  );
}
