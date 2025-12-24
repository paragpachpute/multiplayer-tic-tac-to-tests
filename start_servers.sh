#!/bin/bash

# Navigate to the server directory and start the servers
echo "Starting backend servers..."
cd ../tic-tac-toe-server
pip3 install -r requirements.txt
python3 run_api_server.py &
API_SERVER_PID=$!
echo "API Server started with PID: $API_SERVER_PID"

# Conditionally set short timers if the first argument is "test"
if [ "$1" == "test" ]; then
  echo "Running in TEST mode: Setting short timers."
  export PLAYER_TIMER_SECONDS_STANDARD=5
  export PLAYER_TIMER_SECONDS_ULTIMATE=40
fi

python3 run_game_server.py &
GAME_SERVER_PID=$!
echo "Game Server started with PID: $GAME_SERVER_PID"

# Navigate to the web directory and start the web server
echo "Starting web client..."
cd ../tic-tac-toe-web
python3 -m http.server 8000 &
WEB_SERVER_PID=$!
echo "Web Server started with PID: $WEB_SERVER_PID"

echo "All servers started."
echo "To stop all servers, run: kill $API_SERVER_PID $GAME_SERVER_PID $WEB_SERVER_PID"
