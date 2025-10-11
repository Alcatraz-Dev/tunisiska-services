#!/bin/bash

# Start the Express server in the background
echo "Starting Express server..."
node server.mjs &
SERVER_PID=$!
echo "Express server started with PID: $SERVER_PID"

# Wait a moment for server to start
sleep 2

# Test server connectivity
echo "Testing server connectivity..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running and accessible"
else
    echo "❌ Server startup failed"
    kill $SERVER_PID
    exit 1
fi

# Start Expo development server
echo "Starting Expo development server..."
npx expo start

# Clean up: Kill the server when Expo stops
echo "Stopping Express server..."
kill $SERVER_PID
echo "All services stopped"