import json

def check_win(board):
    """Checks a 3x3 board for a win or draw. Returns player ('X' or 'O'), 'draw', or None."""
    for i in range(3):
        if board[i][0] == board[i][1] == board[i][2] and board[i][0] is not None: return board[i][0]
        if board[0][i] == board[1][i] == board[2][i] and board[0][i] is not None: return board[0][i]
    if board[0][0] == board[1][1] == board[2][2] and board[0][0] is not None: return board[0][0]
    if board[0][2] == board[1][1] == board[2][0] and board[0][2] is not None: return board[0][2]
    if all(cell is not None for row in board for cell in row): return 'draw'
    return None

def find_best_move(board, player):
    """Finds a move by prioritizing: 1. Win, 2. Block, 3. Center, 4. First available."""
    opponent = 'O' if player == 'X' else 'X'
    
    # 1. Win
    for r in range(3):
        for c in range(3):
            if board[r][c] is None:
                board[r][c] = player
                if check_win(board) == player:
                    board[r][c] = None
                    return (r, c)
                board[r][c] = None
    # 2. Block
    for r in range(3):
        for c in range(3):
            if board[r][c] is None:
                board[r][c] = opponent
                if check_win(board) == opponent:
                    board[r][c] = None
                    return (r, c)
                board[r][c] = None
    # 3. Center
    if board[1][1] is None:
        return (1, 1)
    # 4. First available
    for r in range(3):
        for c in range(3):
            if board[r][c] is None:
                return (r, c)
    return None

def generate_valid_draw_sequence():
    """
    Generates a valid sequence of moves that results in a draw by simulating a game
    where both players use a simple but effective AI.
    """
    macro_board = [[None for _ in range(3)] for _ in range(3)]
    micro_boards = [[[None for _ in range(3)] for _ in range(3)] for _ in range(9)]
    active_micro_board_coords = None
    current_player = 'X'
    moves = []
    
    turn_count = 0
    while check_win(macro_board) is None and turn_count < 81:
        turn_count += 1
        
        # --- Determine Board ---
        if active_micro_board_coords:
            macro_r, macro_c = active_micro_board_coords
            if macro_board[macro_r][macro_c] is not None:
                active_micro_board_coords = None # It's a free move

        if active_micro_board_coords is None: # Free move logic
            # On a free move, the best strategy is to send the opponent to a board
            # that is already full or one that you are about to win.
            # This simple AI will just pick the first available non-finished board.
            found_board = False
            for r in range(3):
                for c in range(3):
                    if macro_board[r][c] is None:
                        active_micro_board_coords = [r, c]
                        found_board = True
                        break
                if found_board:
                    break
            if not found_board:
                break # No moves left

        # --- Make Move ---
        macro_r, macro_c = active_micro_board_coords
        board_idx = macro_r * 3 + macro_c
        
        move = find_best_move(micro_boards[board_idx], current_player)
        if move:
            micro_r, micro_c = move
            micro_boards[board_idx][micro_r][micro_c] = current_player
            
            abs_r, abs_c = macro_r * 3 + micro_r, macro_c * 3 + micro_c
            moves.append([abs_r, abs_c])
            
            # --- Update States ---
            winner = check_win(micro_boards[board_idx])
            if winner:
                macro_board[macro_r][macro_c] = winner

            active_micro_board_coords = [micro_r, micro_c]
            current_player = 'O' if current_player == 'X' else 'X'
        else:
            break # No valid moves left on this board
            
    print(f"// Game ended in a draw after {len(moves)} moves.")
    print(f"// Final Macro-Board: {macro_board}")
    print(json.dumps(moves))

if __name__ == "__main__":
    generate_valid_draw_sequence()

