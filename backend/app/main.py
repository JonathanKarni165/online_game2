# --- Minimal Lobby Server ---
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from dataclasses import dataclass, asdict
import asyncio

app = FastAPI()


@dataclass
class Player:
    id: str
    name: str
    color: str


@dataclass
class GamePlayer:
    id: str
    name: str
    color: str
    x: float
    y: float
    vx: float = 0
    vy: float = 0


class LobbyState:
    def __init__(self):
        self.players: Dict[str, Player] = {}

    def add_player(self, player_id: str, name: str, color: str):
        self.players[player_id] = Player(id=player_id, name=name, color=color)

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]

    def to_dict(self):
        return {"players": [asdict(p) for p in self.players.values()]}


class GameState:
    def __init__(self):
        self.players: Dict[str, GamePlayer] = {}
        self.running = False

    def start(self, lobby_players):
        self.players = {p.id: GamePlayer(
            id=p.id, name=p.name, color=p.color, x=100+80*i, y=300) for i, p in enumerate(lobby_players)}
        self.running = True

    def remove_player(self, player_id):
        if player_id in self.players:
            del self.players[player_id]

    def to_dict(self):
        return {"players": [asdict(p) for p in self.players.values()]}


lobby_state = LobbyState()
game_state = GameState()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass


manager = ConnectionManager()


async def game_loop():
    while True:
        if game_state.running:
            # Simple physics
            for p in game_state.players.values():
                p.x += p.vx
                p.y += p.vy
                # Gravity
                p.vy += 0.5
                # Floor
                if p.y > 500:
                    p.y = 500
                    p.vy = 0
            await manager.broadcast(json.dumps({"type": "game", **game_state.to_dict()}))
        await asyncio.sleep(1/30)


@app.on_event("startup")
async def on_start():
    asyncio.create_task(game_loop())


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message["type"] == "join":
                lobby_state.add_player(
                    client_id, message["name"], message["color"])
                await manager.broadcast(json.dumps({"type": "lobby", **lobby_state.to_dict()}))
            elif message["type"] == "leave":
                lobby_state.remove_player(client_id)
                await manager.broadcast(json.dumps({"type": "lobby", **lobby_state.to_dict()}))
            elif message["type"] == "start":
                # Start the game
                game_state.start(list(lobby_state.players.values()))
                await manager.broadcast(json.dumps({"type": "start"}))
            elif message["type"] == "move":
                # {type: 'move', left: bool, right: bool, jump: bool}
                p = game_state.players.get(client_id)
                if p:
                    speed = 5
                    if message.get("left"):
                        p.vx = -speed
                    elif message.get("right"):
                        p.vx = speed
                    else:
                        p.vx = 0
                    if message.get("jump") and p.y >= 500:
                        p.vy = -10
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        lobby_state.remove_player(client_id)
        game_state.remove_player(client_id)
        await manager.broadcast(json.dumps({"type": "lobby", **lobby_state.to_dict()}))
