#!/bin/bash

echo "Stopping Tic-Tac-Toe servers..."

# Use pkill -f to find and kill processes by the command string that started them.
# This is generally safer than ps | grep | awk | kill.

echo "Attempting to stop the API server..."
pkill -f "run_api_server.py"

echo "Attempting to stop the Game server..."
pkill -f "run_game_server.py"

echo "Attempting to stop the Web server..."
pkill -f "http.server 8000"

echo "All server stop commands issued."
