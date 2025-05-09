from flask import Flask, jsonify, request, send_from_directory
import os
import chess
import chess.engine
from draughts import Board, Move, WHITE, BLACK
from draughts.engine import HubEngine, Limit
from flasgger import Swagger
from flask_cors import CORS
import uuid
import socket
from collections import Counter
import re

STOCKFISH_PATH = "C:\\stockfish\\stockfish-windows-x86-64-avx2.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
THEMES_DIRECTORY = os.path.join(BASE_DIR, 'themes')

app = Flask(__name__)
CORS(app)  # This will allow all domains to make requests
swagger = Swagger(app)

# Create a global chess board object to represent the current game
board = chess.Board()
# A global list to store the move history to be able to undo moves
move_history = []

difficulties = {
    "beginner": {"Depth": 3, "Move Overhead": 100, "Skill Level": 5, "UCI_LimitStrength": True, "UCI_Elo": 1320},
    "intermediate": {"Depth": 6, "Move Overhead": 100, "Skill Level": 15, "UCI_LimitStrength": True, "UCI_Elo": 2000},
    "none": {"Skill Level": 0, "Depth": 0},
    "random1": {"Depth": 6, "Move Overhead": 100, "Skill Level": 20, "UCI_LimitStrength": False, "UCI_Elo": 2500},
}


@app.route('/new_game', methods=['GET'])
def new_game():
    """
    Start a new chess game
    ---
    responses:
      200:
        description: A new game is started
        schema:
          type: object
          properties:
            message:
              type: string
            fen:
              type: string
    """
    global board
    global move_history
    board = chess.Board()  # Reset the board to the starting position
    move_history = [] # Clear the move history
    return jsonify({
        'message': 'New game started',
        'fen': board.fen(),  # Return the FEN notation for the starting position
        'turn': 'white',
        'material_balance': material_balance(board)
    })

@app.route('/new_tutorial', methods=['GET'])
def new_tutorial():
    """
    Start a new tutorial game
    ---
    responses:
      200:
        description: A new game is started
        schema:
          type: object
          properties:
            message:
              type: string
            fen:
              type: string
    """
    global board
    board = chess.Board()  # Reset the board to the starting position
    board.set_fen("8/8/8/8/8/8/8/R6R w KQkq - 0 1")  
    return jsonify({
        'message': 'New game started',
        'fen': board.fen(),  # Return the FEN notation for the starting position
        'turn': 'white'
    })

challenges = {}

@app.route('/save_challenge', methods=['POST'])
def save_challenge():
    """
    Save a chess challenge with name and FEN string
    """
    data = request.json
    challenge_id = str(uuid.uuid4())[:8] 
    fen = data.get('fen')
    name = data.get('name', 'Untitled Challenge')

    if not fen:
        return jsonify({'error': 'FEN string is required'}), 400

    challenges[challenge_id] = {'fen': fen, 'name': name}
    return jsonify({'message': 'Challenge saved', 'challenge_id': challenge_id}), 201

@app.route('/get_challenges', methods=['GET'])
def get_challenges():
    """
    Get all saved challenges
    """
    return jsonify({'challenges': challenges}), 200

@app.route('/delete_challenge/<challenge_id>', methods=['DELETE'])
def delete_challenge(challenge_id):
    """
    Delete a chess challenge by ID
    """
    if challenge_id in challenges:
        del challenges[challenge_id]
        return jsonify({'message': f'Challenge {challenge_id} deleted'}), 200
    else:
        return jsonify({'error': f'Challenge {challenge_id} not found'}), 404


@app.route('/update_board', methods=['POST'])
def update_board():
    """
    Uodate the board
    """
    data = request.json
    fen = data.get('fen')

    if not fen:
        return jsonify({'error': 'FEN string is required'}), 400

    global board
    try:
        board.set_fen(fen)
        return jsonify({'message': 'Board updated successfully'}), 200
    except ValueError:
        return jsonify({'error': 'Invalid FEN string'}), 400
    
@app.route('/get_updated_board', methods=['GET'])
def get_updated_board():
    """
    Get the updated board
    """
    global board
    return jsonify({'fen': board.fen()}), 200

@app.route('/get_challenge/<challenge_id>', methods=['GET'])
def get_challenge(challenge_id):
    """
    Get details of a specific challenge by ID
    """
    challenge = challenges.get(challenge_id)
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404
    return jsonify({'challenge': challenge}), 200

@app.route('/update_challenge/<challenge_id>', methods=['PUT'])
def update_challenge(challenge_id):
    """
    Update a chess challenge with the new name and FEN string
    """
    data = request.json
    name = data.get('name')
    fen = data.get('fen')

    if not fen:
        return jsonify({'error': 'FEN string is required'}), 400

    if challenge_id not in challenges:
        return jsonify({'error': 'Challenge not found'}), 404

    challenges[challenge_id] = {'fen': fen, 'name': name}
    return jsonify({'message': 'Challenge updated', 'challenge_id': challenge_id}), 200


@app.route('/move', methods=['POST'])
def make_move():
    """
    Make a move in the chess game
    ---
    parameters:
      - name: move
        in: body
        type: string
        required: true
        description: The chess move in UCI format (e.g., "e2e4")
        schema:
          type: object
          properties:
            move:
              type: string
    responses:
      200:
        description: The move is accepted and the game state is updated
        schema:
          type: object
          properties:
            fen:
              type: string
            is_checkmate:
              type: boolean
            is_stalemate:
              type: boolean
            turn:
              type: string
      400:
        description: Invalid move
    """
    global board
    move_uci = request.json.get('move')  # The move in UCI format (e.g., "e2e4")

    try:
        move = chess.Move.from_uci(move_uci)  # Parse the UCI move
        if move in board.legal_moves:  # Validate if it's a legal move
            move_history.append(board.fen()) # Save the current board state to the move history
            board.push(move)  # Apply the move to the board
        else:
            return jsonify({'error': 'Illegal move'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
        # Determine check_square position in case of checkmate
    check_square = None
    if board.is_checkmate():
        check_square = chess.square_name(board.king(board.turn))  # Set check_square to the king's position
        print(f"Checkmate detected. Check square: {check_square}")
    # Return the updated board state
    return jsonify({
        'fen': board.fen(),  # Updated board position in FEN format
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check(),
        'check_square': check_square,
        'material_balance': material_balance(board)
    })

@app.route('/undo_move', methods=['POST'])
def undo_move():
    global board, move_history
    if move_history:
        last_fen = move_history.pop()  # Remove the last state from the history
        board.set_fen(last_fen)  # Restore the board to the last state

                # Determine check_square position in case of checkmate
        check_square = None
        if board.is_checkmate():
          check_square = chess.square_name(board.king(board.turn))  # Set check_square to the king's position
          print(f"Checkmate detected. Check square: {check_square}")

        return jsonify({
            'message': 'Move undone',
            'fen': last_fen,
            'is_checkmate': board.is_checkmate(),
            'is_stalemate': board.is_stalemate(),
            'turn': 'white' if board.turn == chess.WHITE else 'black',
            'is_check': board.is_check(),
            'check_square': check_square
        })
    return jsonify({'error': 'No moves to undo'}), 400


@app.route('/move_white', methods=['POST'])
def make_move_white():
    """
    Make a move in the chess game
    """
    global board
    move_uci = request.json.get('move')  
    try:
        move = chess.Move.from_uci(move_uci)  
        if board.turn == chess.WHITE and move in board.legal_moves: 
            board.push(move)  
            board.turn = chess.WHITE  
        else:
            return jsonify({'error': 'Illegal move or it is not white\'s turn'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    return jsonify({
        'fen': board.fen(), 
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white',
        'is_check': board.is_check(),
        'material_balance': material_balance(board)
    })

@app.route('/set_fen', methods=['POST'])
def set_fen():
    """
    Set a custom FEN position
    """
    global board
    new_fen = request.json.get('fen')
    try:
        board.set_fen(new_fen)
    except ValueError:
        return jsonify({'error': 'Invalid FEN format'}), 400

    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check(),
        'material_balance': material_balance(board)
    })

@app.route('/simulate_move', methods=['POST'])
def simulate_move():
    """
    Simulate a move and return the resulting board state in FEN format
    without changing the main board.
    ---
    parameters:
      - name: move
        in: body
        type: string
        required: true
        description: The move in UCI format (e.g., "e7e8")
    responses:
      200:
        description: Simulated board state
        schema:
          type: object
          properties:
            fen:
              type: string
              description: FEN notation of the simulated board
      400:
        description: Invalid move format
    """
    global board
    move_uci = request.json.get('move')
    if not move_uci:
        return jsonify({'error': 'Move is required'}), 400

    try:
        # Create a copy of the board for simulation
        temp_board = board.copy()

        # Apply the move to the temporary board
        move = chess.Move.from_uci(move_uci)
        temp_board.push(move)
    except ValueError:
        return jsonify({'error': 'Invalid UCI move format'}), 400

    # Return the simulated board state in FEN format
    return jsonify({
        'fen': temp_board.fen(),
        'turn': 'white' if board.turn == chess.WHITE else 'black'
    })

@app.route('/state', methods=['GET'])
def get_game_state():
    """
    Get the current game state
    ---
    responses:
      200:
        description: The current game state
        schema:
          type: object
          properties:
            fen:
              type: string
            is_checkmate:
              type: boolean
            is_stalemate:
              type: boolean
            turn:
              type: string
    """
    global board
    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'material_balance': material_balance(board)
    })

@app.route('/ai_move', methods=['POST'])
def ai_move():
    """
    AI move endpoint which takes skill level and depth as parameters.
    """
    global board, move_history
    data = request.get_json()
    level = data.get('level', 'none') # Default to 'none' if not provided

    if level not in difficulties:
        return jsonify({'error': 'Invalid difficulty level'}), 400
    
    depth = difficulties[level].get('Depth', 3)
    move_overhead = difficulties[level].get('Move Overhead', 100)
    skill_level = difficulties[level].get('Skill Level', 0)
    uci_limit_strength = difficulties[level].get('UCI_LimitStrength', False)
    uci_elo = difficulties[level].get('UCI_Elo', 0)

    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            # Configure Stockfish with provided skill level
            engine.configure({"Skill Level": skill_level})
            engine.configure({"Move Overhead": move_overhead})
            engine.configure({"UCI_LimitStrength": uci_limit_strength})
            engine.configure({"UCI_Elo": uci_elo})
            
            # Generate the move with specified depth
            limit = chess.engine.Limit(depth=depth)
            ai_move = engine.play(board, limit)
            board.push(ai_move.move)

            return jsonify({
                'fen': board.fen(),
                'ai_move': ai_move.move.uci(),
                'is_checkmate': board.is_checkmate(),
                'is_stalemate': board.is_stalemate(),
                'turn': 'white' if board.turn == chess.WHITE else 'black',
                'from': chess.square_name(ai_move.move.from_square),
                'to': chess.square_name(ai_move.move.to_square),
                'material_balance': material_balance(board),
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/hint', methods=['POST'])
def get_hint():
    """
    Provide a hint for the best move from the current position.
    ---
    responses:
      200:
        description: Suggests the best move based on the current board state.
        schema:
          type: object
          properties:
            move:
              type: string
              example: "e2e4"
            message:
              type: string
              example: "Best move suggestion."
      500:
        description: Error processing the hint request.
    """
    global board

    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            result = engine.play(board, chess.engine.Limit(time=0.1))  # or use depth
            best_move = result.move.uci()
            return jsonify({
                'move': best_move,
                'message': 'Best move suggestion.'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/legal_moves', methods=['POST'])
def legal_moves():
    """
    Get all legal moves for a piece at a specific position
    ---
    parameters:
      - name: move
        in: body
        type: string
        required: true
        description: The position of the piece (e.g., "e2")
        schema:
          type: object
          properties:
            position:
              type: string
    responses:
      200:
        description: All legal moves for the piece
        schema:
          type: object
          properties:
            legal_moves:
              type: array
              items:
                type: string
                description: The legal move in UCI format (e.g., "e2e4")
    """
    global board
    position = request.json.get('position')  # Get the position (e.g., "e2") from query parameters
    if not position:
        return jsonify({'error': 'Position is required'}), 400

    # Convert the position to a square (e.g., "e2" -> chess.E2)
    try:
        square = chess.parse_square(position)
    except ValueError:
        return jsonify({'error': 'Invalid position'}), 400

    # Find all legal moves for the piece at the given square
    legal_moves = [
        chess.square_name(move.to_square) for move in board.legal_moves if move.from_square == square
    ]

    return jsonify({
        'legal_moves': legal_moves
    })

# source: https://github.com/niklasf/python-chess/discussions/864
def material_balance(board):
    white = board.occupied_co[chess.WHITE]
    black = board.occupied_co[chess.BLACK]
    return (
        chess.popcount(white & board.pawns) - chess.popcount(black & board.pawns) +
        3 * (chess.popcount(white & board.knights) - chess.popcount(black & board.knights)) +
        3 * (chess.popcount(white & board.bishops) - chess.popcount(black & board.bishops)) +
        5 * (chess.popcount(white & board.rooks) - chess.popcount(black & board.rooks)) +
        9 * (chess.popcount(white & board.queens) - chess.popcount(black & board.queens))
    )

@app.route('/captured_pieces', methods=['GET'])
def get_captured_pieces():
    """
    Get the captured pieces for each player
    ---
    responses:
      200:
        description: The captured pieces for each player
        schema:
          type: object
          properties:
            white:
              type: object
              properties:
                p:
                  type: integer
                n:
                  type: integer
                b:
                  type: integer
                r:
                  type: integer
                q:
                  type: integer
            black:
              type: object
              properties:
                p:
                  type: integer
                n:
                  type: integer
                b:
                  type: integer
                r:
                  type: integer
                q:
                  type: integer
    """
    global board
    starting_pieces = Counter({
        chess.PAWN: 8,
        chess.KNIGHT: 2,
        chess.BISHOP: 2,
        chess.ROOK: 2,
        chess.QUEEN: 1,
        chess.KING: 1
    })

    # Count remaining pieces on the board, grouped by type
    remaining_white = Counter(piece.piece_type for piece in board.piece_map().values() if piece.color == chess.WHITE)
    remaining_black = Counter(piece.piece_type for piece in board.piece_map().values() if piece.color == chess.BLACK)

    # Calculate captured pieces
    captured_white = starting_pieces - remaining_black
    captured_black = starting_pieces - remaining_white

    # Format the output as a dictionary
    def format_captured(captured):
        return {
            'p': captured[chess.PAWN],
            'n': captured[chess.KNIGHT],
            'b': captured[chess.BISHOP],
            'r': captured[chess.ROOK],
            'q': captured[chess.QUEEN]
        }

    return {
        'white': format_captured(captured_white),
        'black': format_captured(captured_black)
    }

games = {}

def get_local_ip():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    return local_ip

# Endpoint to return the local IP address
@app.route('/get_ip', methods=['GET'])
def get_ip():
    local_ip = get_local_ip()
    return jsonify({'ip': local_ip})

def create_new_game():
    """ Helper function to create a new chess board """
    return {
        'board': chess.Board(),
        'players': {
            'white': None,
            'black': None
        },
        'move_history': [],
        'game_name': 'Untitled Game',
        'theme': 'regular'        
    }

@app.route('/multiplayer/create', methods=['POST'])
def create_game():
    """
    Create a new multiplayer chess game
    ---
    responses:
      200:
        description: A new game is created
        schema:
          type: object
          properties:
            game_id:
              type: string
            fen:
              type: string
            message:
              type: string
    """
    data = request.get_json()
    game_name = data.get('game_name', 'Untitled Game')
    theme = data.get('theme', 'regular')

    game_id = str(uuid.uuid4())[:8] # Generate a unique game ID
    games[game_id] = create_new_game()  # Create a new game instance
    games[game_id]['game_name'] = game_name # Set the game name
    games[game_id]['theme'] = theme # Set the theme

    return jsonify({
        'message': 'Game created',
        'game_id': game_id,
        'fen': games[game_id]['board'].fen(),
        'turn': 'white',
        'game_name': game_name,
        'theme': theme
    })

@app.route('/multiplayer/join', methods=['POST'])
def join_game():
    """
    Join a multiplayer chess game
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - game_id
            - player
          properties:
            game_id:
              type: string
              description: The unique ID of the game to join
            player:
              type: string
              description: The player color to join (either 'white' or 'black')
    responses:
      200:
        description: Successfully joined the game
        schema:
          type: object
          properties:
            message:
              type: string
              example: "You joined as white"
            game_id:
              type: string
              example: "8eec2714-c438-444b-8d4c-3346c273da4d"
      400:
        description: Invalid request (e.g., missing fields or invalid game ID)
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Game ID not found"
    """
    data = request.get_json()
    game_id = data.get('game_id')
    player_color = data.get('player')

    if game_id not in games:
        return jsonify({'error': 'Game ID not found'}), 400
    if player_color not in ['white', 'black']:
        return jsonify({'error': 'Invalid player color'}), 400
    if games[game_id]['players'][player_color]:
        return jsonify({'error': f'{player_color} is already taken'}), 400

    # Assign the player to the chosen color (using IP as player identity)
    games[game_id]['players'][player_color] = request.remote_addr

    return jsonify({
        'message': f'You joined as {player_color}',
        'game_id': game_id,
        'players': games[game_id]['players']
    })

@app.route('/multiplayer/move', methods=['POST'])
def move_multiplayer():
    data = request.get_json()
    game_id = data.get('game_id')
    move_uci = data.get('move')

    if not game_id or not move_uci:
        return jsonify({'error': 'game_id and move are required'}), 400

    if game_id not in games:
        return jsonify({'error': 'Game ID not found'}), 400

    # Get the game and board from the global games dictionary
    game = games[game_id]
    board = game['board']
    current_turn = 'white' if board.turn == chess.WHITE else 'black'

    player_ip = request.remote_addr
    if game['players'][current_turn] != player_ip:
        return jsonify({'error': 'It is not your turn'}), 400

    try:
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)
            player_color = current_turn.capitalize()  # "White" or "Black"
            from_square = chess.square_name(move.from_square)
            to_square = chess.square_name(move.to_square)
            game['move_history'].append(f"{player_color}: {from_square} to {to_square}")

        else:
            return jsonify({'error': 'Illegal move'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Determine check_square position in case of checkmate
    check_square = None
    if board.is_checkmate():
        check_square = chess.square_name(board.king(board.turn))
        game['is_complete'] = True 

    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check(),
        'check_square': check_square,
        'message': 'Game over' if board.is_checkmate() or board.is_stalemate() else ''
    })


@app.route('/multiplayer/game_state', methods=['GET'])
def get_game_state_multiplayer():
    """
    Get the current state of a multiplayer chess game
    ---
    parameters:
      - name: game_id
        in: query
        type: string
        required: true
        description: The game ID to get the state for
    responses:
      200:
        description: The current game state
        schema:
          type: object
          properties:
            fen:
              type: string
            is_checkmate:
              type: boolean
            is_stalemate:
              type: boolean
            turn:
              type: string
            players:
              type: object
              properties:
                white:
                  type: string
                  description: The player who joined as white
                black:
                  type: string
                  description: The player who joined as black
      400:
        description: Invalid game ID
    """
    game_id = request.args.get('game_id')

    if game_id not in games:
        return jsonify({'error': 'Game ID not found'}), 400

    game = games[game_id]
    board = game['board']

    check_square = None
    if board.is_checkmate():
        checkers = board.checkers()
        if checkers:
            check_square = chess.square_name(checkers.pop())

    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check(),
        'check_square': check_square,
        'players': game['players'],
        'move_history': game['move_history'],
        'game_name': game.get('game_name', 'Untitled Game'),
        'theme': game.get('theme', 'regular')
    })

@app.route('/multiplayer/legal_moves_multi', methods=['POST'])
def legal_moves_multi():
    """
    Get all legal moves for a piece at a specific position in a multiplayer game
    ---
    parameters:
      - name: game_id
        in: body
        type: string
        required: true
        description: The game ID of the multiplayer game
      - name: position
        in: body
        type: string
        required: true
        description: The position of the piece (e.g., "e2")
    responses:
      200:
        description: All legal moves for the piece
        schema:
          type: object
          properties:
            legal_moves:
              type: array
              items:
                type: string
                description: The legal move in UCI format (e.g., "e2e4")
    """
    data = request.get_json()
    game_id = data.get('game_id')
    position = data.get('position')

    if not game_id or not position:
      return jsonify({'error': 'Missing game_id or position'}), 400

    # Check if the game ID exists
    if game_id not in games:
      return jsonify({'error': 'Game ID not found'}), 400

    # Get the game and board
    game = games[game_id]
    board = game['board']

    # Convert the position to a square ("e2" -> chess.E2)
    try:
      square = chess.parse_square(position)

    except ValueError:
      return jsonify({'error': 'Invalid position'}), 400

    # Find all legal moves for the piece at the given square
    legal_moves = [
      chess.square_name(move.to_square) for move in board.legal_moves if move.from_square == square
    ]

    return jsonify({
      'legal_moves': legal_moves
    })

@app.route('/multiplayer/games', methods=['GET'])
def list_games():
    active_games = []

    for game_id, game in games.items():
        if not game['board'].is_game_over():  # Only show active games
            active_games.append({
                'game_id': game_id,
                'players': game['players'],
                'status': 'waiting' if None in game['players'].values() else 'in-progress',
                'game_name': game.get('game_name', 'Untitled Game'),
                'theme': game.get('theme', 'regular')
            })
    return jsonify(active_games)

@app.route('/multiplayer/leave', methods=['POST'])
def leave_game():
    """
    Handle a player leaving the game. If both players leave, delete the game.
    """
    data = request.get_json()
    game_id = data.get('game_id')
    player_color = data.get('player')

    if not game_id or not player_color:
        return jsonify({'error': 'game_id and player are required'}), 400

    if game_id not in games:
        return jsonify({'error': 'Game ID not found'}), 400

    # Set the player as disconnected
    games[game_id]['players'][player_color] = None

    # Check if both players have disconnected, then delete the game
    if not games[game_id]['players']['white'] and not games[game_id]['players']['black']:
        del games[game_id]
        return jsonify({'message': 'Game deleted due to both players leaving'}), 200

    return jsonify({'message': f'{player_color} has left the game', 'game_id': game_id})

@app.route('/themes', methods=['GET'])
def list_themes():
  """
  List all available themes
  ---
  responses:
    200:
      description: A list of available themes
      schema:
        type: object
        properties:
          themes:
            type: array
            items:
              type: string
              description: The name of the theme
  """
  try:
    themes = [theme for theme in os.listdir(THEMES_DIRECTORY) if os.path.isdir(os.path.join(THEMES_DIRECTORY, theme))]
    return jsonify({'themes': themes}), 200
  except Exception as e:
    return jsonify({'error': str(e)}), 500

@app.route('/themes/<theme>/<filename>', methods=['GET'])
def get_theme_file(theme, filename):
    """
    Serve static files from the theme folders.

    ---
    parameters:
      - name: theme
        in: path
        type: string
        required: true
        description: The theme name
      - name: filename
        in: path
        type: string
        required: true
        description: The file name to serve
    responses:
      200:
        description: The requested file
      404:
        description: The file was not found

    """
    theme_path = os.path.join(THEMES_DIRECTORY, theme)
    return send_from_directory(theme_path, filename)
  
# Custom difficulty endpoints

@app.route('/difficulty/create', methods=['POST'])
def create_difficulty():
    data = request.get_json()
    level = data.get('level')
    settings = data.get('settings')
    
    if level in difficulties:
        return jsonify({'error': 'Difficulty already exists'}), 400

    difficulties[level] = settings
    return jsonify({'message': f'Difficulty {level} created', 'settings': settings}), 201

@app.route('/difficulty/list', methods=['GET'])
def list_difficulties():
    # Remove predefined difficulty levels to list only custom ones
    custom_difficulties = {k: v for k, v in difficulties.items() if k not in ['beginner', 'intermediate', 'none']}
    return jsonify(custom_difficulties)

@app.route('/difficulty/get', methods=['GET'])
def get_difficulty():
    level = request.args.get('level')
    if level not in difficulties:
      return jsonify({'error': 'Difficulty not found'}), 404

    return jsonify({'level': level, 'settings': difficulties[level]}), 200

@app.route('/difficulty/update', methods=['POST'])
def edit_difficulty():
    data = request.get_json()
    level = data.get('level')
    new_settings = data.get('settings')

    if level not in difficulties:
        return jsonify({'error': 'Difficulty not found'}), 404

    difficulties[level].update(new_settings)
    return jsonify({'message': f'Difficulty {level} updated', 'new_settings': difficulties[level]}), 200

@app.route('/difficulty/delete', methods=['POST'])
def delete_difficulty():
    data = request.get_json()
    level = data.get('level')

    if level not in difficulties:
        return jsonify({'error': 'Difficulty not found'}), 404

    del difficulties[level]
    return jsonify({'message': f'Difficulty {level} deleted'}), 200

# Checkers API Endpoints

# Initialize a global checkers board object
checkersBoard = Board(variant="frysk", fen="startpos")
engine = None

def generate_square_num_to_position_map():
    """
    Generates a mapping of square numbers (1-50) to board positions.
    """
    mapping = {}
    square_num = 1
    files_even_rank = ['b', 'd', 'f', 'h', 'j']  # Dark squares in even ranks
    files_odd_rank = ['a', 'c', 'e', 'g', 'i']   # Dark squares in odd ranks

    for rank in range(10, 0, -1):  # Rows 10 to 1
        is_even = rank % 2 == 0
        files = files_even_rank if is_even else files_odd_rank

        for file in files:
            mapping[square_num] = f"{file}{rank}"
            square_num += 1

    return mapping

# Generate a mapping of square numbers to board positions for FE
def convert_pdn_to_notation(pdn_move):
    """
    Converts a PDN move ("34x28") to board notation ("h4 x e2").
    """
    square_num_to_position_map = generate_square_num_to_position_map()
    parts = re.split(r'[-x]', pdn_move)
    is_capture = 'x' in pdn_move
    converted_parts = [square_num_to_position_map[int(part)] for part in parts]
    return f" {'x' if is_capture else '-'} ".join(converted_parts)

def generate_position_to_square_num_map():
    """
    Generates a mapping of board positions to square numbers (reverse of above).
    """
    square_num_to_position_map = generate_square_num_to_position_map()
    return {v: k for k, v in square_num_to_position_map.items()}


@app.route('/checkers/checkers_new_game', methods=['POST'])
def checkers_new_game():
    global checkersBoard
    data = request.get_json()
    variant = data.get('variant', 'standard')     # Default to 'standard'
    piece_count = data.get('piece_count', None)   # Number of pieces per side
    king_count = data.get('king_count', 0)        # Number of kings per side

    if variant == 'frysk':
      checkersBoard = Board(variant="frysk", fen="startpos")
    else:
      fen = generate_custom_fen(piece_count, king_count, variant="standard")
      checkersBoard = Board(variant="standard", fen=fen)

    board_map = parse_checkers_fen(checkersBoard.fen)

    return jsonify({
        'fen': checkersBoard.fen,
        'turn': 'white' if checkersBoard.turn == WHITE else 'black',
        'board_map': board_map
    })


def generate_custom_fen(piece_count, king_count=0, variant="standard"):
    """
    Generate a FEN string for a given piece_count and king_count.
    """
    # Define starting positions for up to 20 pieces per side
    black_starts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                    11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    white_starts = [50, 49, 48, 47, 46, 45, 44, 43, 42, 41,
                    40, 39, 38, 37, 36, 35, 34, 33, 32, 31]

    # Trim to piece_count
    black_positions = black_starts[:piece_count]
    white_positions = white_starts[:piece_count]

    # Ensure king_count is not more than piece_count (should be capped by FE too)
    king_count = min(king_count, piece_count)

    # Split pieces into kings and men
    black_kings = black_positions[:king_count]
    black_men = black_positions[king_count:]
    white_kings = white_positions[:king_count]
    white_men = white_positions[king_count:]

    # Function to format a list of kings and men for a given color
    def format_pieces(color, kings, men):
        # color: 'W' or 'B'
        pieces = []
        # Start with kings if any
        if kings:
            # First king piece sets the color and the king prefix
            pieces.append(f"{color}K{kings[0]}")
            # Next kings just get 'K' prefix
            for kpos in kings[1:]:
                pieces.append(f"K{kpos}")
            # Now if men follow, they come after the kings without repeating color
            for mpos in men:
                pieces.append(str(mpos))
        else:
            # No kings, start with men
            if men:
                # First man sets the color
                pieces.append(f"{color}{men[0]}")
                # Next men just their position
                for mpos in men[1:]:
                    pieces.append(str(mpos))
        return ",".join(pieces)

    white_fen = format_pieces('W', white_kings, white_men)
    black_fen = format_pieces('B', black_kings, black_men)

    fen = f"W:{white_fen}:{black_fen}" # Combine the FEN parts
    return fen

def parse_checkers_fen(fen):
    """
    Parse a FEN string for checkers into a dictionary of positions and piece types.
    Piece types:
      - 'r' = white man
      - 'R' = white king
      - 'b' = black man
      - 'B' = black king
    """
    board_map = {}
    parts = fen.split(':')
    piecePositions = parts[1:]  # Skip the first part, which usually is 'W' or 'B'

    squareNumToPositionMap = generate_square_num_to_position_map()

    for piecePos in piecePositions:
        if len(piecePos) == 0:
            continue
        color = piecePos[0]  # 'W' or 'B'
        positionsStr = piecePos[1:]  # Remove the color letter

        # Split positions and handle kings
        positionsArr = positionsStr.split(',')
        for posStr in positionsArr:
            if not posStr:
                continue

            isKing = 'K' in posStr
            posNumStr = posStr.replace('K', '')

            try:
                squareNum = int(posNumStr)
            except ValueError:
                continue

            boardPos = squareNumToPositionMap.get(squareNum)
            if boardPos:
                pieceType = 'r' if color == 'W' else 'b'
                if isKing:
                    pieceType = pieceType.upper()  # 'R' or 'B' for kings
                board_map[boardPos] = pieceType

    return board_map

def initialize_engine():
    """
    Initialize the Scan engine if all necessary files exist in the backend directory.
    """
    # All scan.exe, scan.ini and data folder should be in backend file to work!
    backend_dir = os.path.dirname(os.path.abspath(__file__))  # Get the backend directory
    scan_exe = os.path.join(backend_dir, "scan.exe")
    scan_ini = os.path.join(backend_dir, "scan.ini")
    data_dir = os.path.join(backend_dir, "data")

    # Check if all required files and directories exist
    if not os.path.exists(scan_exe):
        print("Warning: scan.exe not found in the backend directory. Skipping engine initialization.")
        return None
    
    if not os.path.exists(scan_ini):
        print("Warning: scan.ini not found in the backend directory. Skipping engine initialization.")
        return None
    
    if not os.path.exists(data_dir):
        print("Warning: data directory not found in the backend directory. Skipping engine initialization.")
        return None

    try:
        os.chdir(backend_dir)  # Set working directory to backend folder
        engine = HubEngine([r"scan.exe", "hub"])
        engine.init()
        return engine
    
    except Exception as e:
        print(f"Error initializing Scan engine: {e}")
        return None

# Initialize the engine globally
engine = initialize_engine()

@app.route('/checkers/checkers_ai_move', methods=['POST'])
def checkers_ai_move():
    """
    Calculate the AI move for the current state of the board.
    --- 
    responses:
      200:
        description: AI move calculated successfully
        schema:
          type: object
          properties:
            fen:
              type: string
            ai_move:
              type: string
            turn:
              type: string
            is_over:
              type: boolean
      500:
        description: Error during AI calculation
    """
    global checkersBoard

    try:
        limit = Limit(time=10)
        result = engine.play(checkersBoard, limit, ponder=False)
        ai_move = result.move
        checkersBoard.push(ai_move)

        # Convert AI move to board notation
        ai_move = convert_pdn_to_notation(ai_move.pdn_move)

        return jsonify({
            'fen': checkersBoard.fen,
            'ai_move': ai_move,
            'turn': 'white' if checkersBoard.turn == WHITE else 'black',
            'is_over': checkersBoard.is_over()
        })
    
    except Exception as e:
        print("Error in AI move:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/checkers/checkers_move', methods=['POST'])
def checkers_make_move():
    """
    Make a move in the checkers game.
    ---
    parameters:
      - name: move
        in: body
        type: string
        required: true
        description: The move in PDN format (e.g., "34-30")
        schema:
          type: object
          properties:
            move:
              type: string
              example: "34-30"
    responses:
      200:
        description: Move applied successfully
        schema:
          type: object
          properties:
            fen:
              type: string
            is_over:
              type: boolean
            turn:
              type: string
      400:
        description: Invalid move
    """
    global checkersBoard
    move_pdn = request.json.get('move')

    # Convert all legal moves to readable board notation ("h4 x e2")
    legal_moves_pdn = [convert_pdn_to_notation(move.pdn_move) for move in checkersBoard.legal_moves()]

    if move_pdn not in legal_moves_pdn:
        return jsonify({'error': 'Illegal move'}), 400

    # Find and apply the matching move
    for move in checkersBoard.legal_moves():
        if convert_pdn_to_notation(move.pdn_move) == move_pdn:  # Match readable notation
            checkersBoard.push(move)
            break

    # Convert remaining legal moves for potential captures to board notation
    next_legal_moves = [convert_pdn_to_notation(move.pdn_move) for move in checkersBoard.legal_moves()]
    continue_capture = any('x' in move for move in next_legal_moves)

    return jsonify({
        'fen': checkersBoard.fen,
        'is_over': checkersBoard.is_over(),
        'turn': 'white' if checkersBoard.turn == WHITE else 'black',
        'is_capture': 'x' in move_pdn,
        'continue_capture': continue_capture,
        'legal_moves': next_legal_moves if continue_capture else [],
        'ai_available': engine is not None
    })


@app.route('/checkers/checkers_state', methods=['GET'])
def checkers_get_game_state():
    """
    Get the current game state.
    ---
    responses:
      200:
        description: The current game state
        schema:
          type: object
          properties:
            fen:
              type: string
            is_over:
              type: boolean
            turn:
              type: string
    """
    global checkersBoard
    board_map = parse_checkers_fen(checkersBoard.fen)
    return jsonify({
        'fen': checkersBoard.fen,
        'is_over': checkersBoard.is_over(),
        'turn': 'white' if checkersBoard.turn == WHITE else 'black',
        'board_map': board_map
    })


@app.route('/checkers/checkers_legal_moves', methods=['POST'])
def checkers_get_legal_moves():
    """
    Get all legal moves for the current player.
    ---
    responses:
      200:
        description: List of all legal moves
        schema:
          type: object
          properties:
            legal_moves:
              type: array
              items:
                type: string
    """
    global checkersBoard
    try:
        position = request.json.get("position")

        if position is None:
            return jsonify({'error': 'Position is required'}), 400

        # Convert position to square number
        position_to_square_num_map = generate_position_to_square_num_map()
        square_num = position_to_square_num_map.get(position)
        if square_num is None:
            return jsonify({'error': 'Invalid position'}), 400

        # Filter and convert legal moves for the given position
        legal_moves = [
            convert_pdn_to_notation(move.pdn_move)
            for move in checkersBoard.legal_moves()
            if int(move.pdn_move.split('x')[0] if 'x' in move.pdn_move else move.pdn_move.split('-')[0]) == square_num
        ]

        return jsonify({'legal_moves': legal_moves})
    
    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 500
    
@app.route('/checkers/playable_pieces', methods=['GET'])
def checkers_get_playable_pieces():
    """
    Get all pieces that can make a move in the current turn.
    ---
    responses:
      200:
        description: List of all playable pieces
        schema:
          type: object
          properties:
            playable_pieces:
              type: array
              items:
                type: string
    """
    global checkersBoard
    try:
        # Get starting squares of all legal moves
        playable_squares = {
            int(move.pdn_move.split('x')[0] if 'x' in move.pdn_move else move.pdn_move.split('-')[0])
            for move in checkersBoard.legal_moves()
        }

        # Convert to board notation
        square_num_to_position_map = generate_square_num_to_position_map()
        playable_positions = [square_num_to_position_map[square] for square in playable_squares]

        return jsonify({'playable_pieces': playable_positions}), 200
    
    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 500
    
@app.route('/checkers/checkers_custom_setup', methods=['POST'])
def checkers_custom_setup():
    global checkersBoard
    data = request.get_json()
    fen = data.get('fen', 'W::B')  # default empty board if none provided
    variant = data.get('variant', 'standard')

    checkersBoard = Board(variant=variant, fen=fen)
    board_map = parse_checkers_fen(checkersBoard.fen)

    return jsonify({
        'message': 'Custom setup applied',
        'fen': checkersBoard.fen,
        'turn': 'white' if checkersBoard.turn == WHITE else 'black',
        'board_map': board_map
    })

@app.route('/checkers/generate_fen_from_setup', methods=['POST'])
def generate_fen_from_setup():
    data = request.get_json()
    pieces = data.get('pieces', [])

    square_num_to_position_map = generate_square_num_to_position_map()
    position_to_square_num = {v: k for k, v in square_num_to_position_map.items()}

    white_men = []
    white_kings = []
    black_men = []
    black_kings = []

    # Parse the pieces and assign them to the respective lists
    for p in pieces:
        pos = p['position']
        ptype = p['type']
        sq_num = position_to_square_num.get(pos) # Get square number from position
        if not sq_num:
            continue

        if ptype == 'r':
            white_men.append(sq_num)
        elif ptype == 'R':
            white_kings.append(sq_num)
        elif ptype == 'b':
            black_men.append(sq_num)
        elif ptype == 'B':
            black_kings.append(sq_num)

    # Generate the FEN string
    def format_pieces(color, kings, men):
        pieces = []
        if kings:
            # First king piece sets the color and the king prefix
            pieces.append(f"{color}K{kings[0]}")
            # Next kings just get 'K' prefix
            for kpos in kings[1:]:
                pieces.append(f"K{kpos}")
            for mpos in men:
                pieces.append(str(mpos))
        else:
            # Man pieces
            if men:
                # Sets the color
                pieces.append(f"{color}{men[0]}")
                for mpos in men[1:]:
                    # Just numbers after
                    pieces.append(str(mpos))
            else:
                pieces.append(color)
        return ",".join(pieces)

    white_fen = format_pieces('W', white_kings, white_men)
    black_fen = format_pieces('B', black_kings, black_men)
    fen = f"W:{white_fen}:{black_fen}"

    return jsonify({'fen': fen})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

