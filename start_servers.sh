#!/bin/bash

# Navigate to the server directory and start the servers
echo "Starting backend servers..."
cd ../multiplayer-tic-tac-to
pip3 install -r requirements.txt

# Conditionally set test mode environment variables if the first argument is "test"
if [ "$1" == "test" ]; then
  echo "Running in TEST mode: Setting short timers and fresh database."
  export PLAYER_TIMER_SECONDS_STANDARD=5
  export PLAYER_TIMER_SECONDS_ULTIMATE=40
  export TEST_MODE=true
  export DATABASE_FILE="database/test_game_results.db"
fi

python3 run_api_server.py &
API_SERVER_PID=$!
echo "API Server started with PID: $API_SERVER_PID"

python3 run_game_server.py &
GAME_SERVER_PID=$!
echo "Game Server started with PID: $GAME_SERVER_PID"

# Navigate to the web directory and start the web server
echo "Starting web client..."
cd ../multiplayer-tic-tac-to-web
python3 -m http.server 8000 &
WEB_SERVER_PID=$!
echo "Web Server started with PID: $WEB_SERVER_PID"

echo "All servers started."
echo "To stop all servers, run: kill $API_SERVER_PID $GAME_SERVER_PID $WEB_SERVER_PID"
