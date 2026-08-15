# Setup and Execution Guide

This guide provides instructions for setting up, running, and configuring the Liquid Galaxy RPG Game locally or in a multi-display environment.

---

## 1. Prerequisites

Before running the game, ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Modern Web Browser**: Chrome, Edge, Firefox, or Brave

---

## 2. Installation

1. Clone or open the repository folder in your terminal:
   ```bash
   cd "c:/Users/HP/Desktop/RPG Game/rpg-game-lg"
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

---

## 3. Running the Game (Development Mode)

To start both the **Socket.io Relay Server** (Port `8128`) and the **Vite Web Server** (Port `5173`) simultaneously, run:

```bash
npm run dev
```

Upon executing this command, you will see output similar to:
```text
[0] Socket.io Server running on port 8128
[1]   VITE v8.x.x  ready in XXX ms
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: http://192.168.x.x:5173/
```

---

## 4. Multi-Display / Liquid Galaxy Setup

The game is designed for multi-display setups (or testing using multiple browser tabs).

### Single-Player / Master Screen Only
Open your web browser and navigate to:
```text
http://localhost:5173/
```
* **Master Node (`screen=1`)**: Handles input controls, physics calculations, enemy AI, and UI/HUD rendering.

---

### Dual-Display Setup (Master + Slave 1)
1. **Screen 1 (Master)**: Open `http://localhost:5173/` in Window 1.
2. **Screen 2 (Slave 1)**: Open `http://localhost:5173/?screen=2` in Window 2.

---

### Triple-Display Liquid Galaxy Setup
For a 3-monitor panoramic view setup:

| Monitor | URL / Parameter | Role |
| :--- | :--- | :--- |
| **Left Display** | `http://localhost:5173/?screen=2` | Slave Screen (Left View Offset) |
| **Center Display** | `http://localhost:5173/?screen=1` | **Master Screen** (Controls & HUD) |
| **Right Display** | `http://localhost:5173/?screen=3` | Slave Screen (Right View Offset) |

> [!NOTE]
> Slave screens connect to the Socket.io server and automatically sync player movement, direction flips, enemy positions, and scene transitions without rendering the HUD overlay.

---

## 5. Controls

| Action | Keyboard Controls |
| :--- | :--- |
| **Movement** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Attack** | `Spacebar` or `J` |
| **Interact (NPC / Doors)** | `E` |
| **Pause Game** | `ESC` or `P` |

---

## 6. Project Scripts

- **`npm run dev`**: Starts both the Socket server (`server.js`) and Vite server concurrently.
- **`npm run build`**: Runs TypeScript type checking (`tsc`) and builds production assets into `dist/`.
- **`npm run preview`**: Previews the production build locally.

---

## 7. Troubleshooting

- **Socket Connection Error**: Ensure port `8128` is not blocked by a firewall or used by another application.
- **TypeScript Error**: Run `npx tsc --noEmit` to verify type safety.
- **Asset Loading Errors**: Verify assets exist under `public/assets/` and tilemaps under `public/maps/`.
