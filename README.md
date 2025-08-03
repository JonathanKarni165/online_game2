# Multiplayer Co-op Browser Game

A real-time multiplayer browser game built with FastAPI (WebSocket) backend and React + Phaser frontend.

## Features

- Multiplayer co-op gameplay
- Real-time player movement and interactions
- Player customization (name and color)
- Enemy spawning and AI
- Physics-based gameplay
- Ready system with countdown
- Game state synchronization
- Death and restart mechanics

## Prerequisites

- Python 3.7+
- Node.js 14+
- npm or yarn

## Setup

1. Clone the repository
2. Set up the backend:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install fastapi uvicorn websockets python-dotenv
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

## Running the Game

1. Start the backend server:

   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend development server:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to the URL shown in the frontend console (usually http://localhost:5173)

## How to Play

1. Enter your name and choose a color
2. Click "Start Game" to join
3. Click "Ready" when you want to start
4. When all players are ready, a countdown will begin
5. Use WASD or Arrow keys to move and jump
6. Jump on enemies to defeat them
7. Avoid enemy side contact
8. Last player standing wins!

## Controls

- W or Up Arrow: Jump
- A or Left Arrow: Move Left
- D or Right Arrow: Move Right
- Space: Ready up (in lobby)

## Game Rules

- Players can move left/right and jump
- Touching an enemy from the side results in death
- Jumping on top of an enemy defeats it
- Players can bounce off each other
- When all players die, the game can be restarted
