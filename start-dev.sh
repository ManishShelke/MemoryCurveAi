#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MemoryCurve AI – Start both frontend and backend in one step
# ─────────────────────────────────────────────────────────────
# Usage: bash start-dev.sh
# ─────────────────────────────────────────────────────────────

export PATH="/opt/homebrew/bin:$PATH"

# Check for server .env
if [ ! -f "server/.env" ]; then
  echo "❌ ERROR: server/.env is missing!"
  echo "   Create it: cp server/.env.example server/.env"
  echo "   Then add your GEMINI_API_KEY from https://aistudio.google.com/apikey"
  exit 1
fi

echo "🚀 Starting MemoryCurve AI..."
echo ""

# Start backend in background
echo "📡 Starting backend server on :3001..."
(cd server && node server.js) &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "🌐 Starting frontend on :5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
