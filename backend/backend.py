from flask import Flask, jsonify, request, send_from_directory
import os
import chess
import chess.engine
from draughts import Board, Move, WHITE, BLACK
from flasgger import Swagger
from flask import Flask
from flask_cors import CORS
import uuid
import socket
from collections import Counter

app = Flask(__name__)
CORS(app)  # This will allow all domains to make requests
swagger = Swagger(app)

# Create a global chess board object to represent the current game
board = chess.Board()
# A global list to store the move history to be able to undo moves
move_history = []

STOCKFISH_PATH = "C:\stockfish\stockfish-windows-x86-64-avx2.exe"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
THEMES_DIRECTORY = os.path.join(BASE_DIR, 'themes')

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
    board.set_fen("8/8/8/8/8/8/8/R7 w KQkq - 0 1")  
    return jsonify({
        'message': 'New game started',
        'fen': board.fen(),  # Return the FEN notation for the starting position
        'turn': 'white'
    })

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
    skill_level = request.json.get("skill_level", 5)  # Default to skill level 5
    depth = request.json.get("depth", 2)              # Default to depth 2

    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            # Configure Stockfish with provided skill level
            engine.configure({"Skill Level": skill_level})
            
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
        }
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
    game_id = str(uuid.uuid4())[:8]   # Generate a unique game ID
    games[game_id] = create_new_game()  # Create a new game instance

    return jsonify({
        'message': 'Game created',
        'game_id': game_id,
        'fen': games[game_id]['board'].fen(),
        'turn': 'white'
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

    game = games[game_id]
    board = game['board']
    current_turn = 'white' if board.turn == chess.WHITE else 'black'
    
    player_ip = request.remote_addr
    if game['players'][current_turn] != player_ip:
        return jsonify({'error': 'It is not your turn or you are not a player in this game'}), 400

    try:
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)
        else:
            return jsonify({'error': 'Illegal move'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Determine check_square position in case of checkmate
    check_square = None
    if board.is_checkmate():
        check_square = chess.square_name(board.king(board.turn))  # Set check_square to the king's position
        print(f"Checkmate detected. Check square: {check_square}")
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

    # If checkmate, determine the checking square once for both players
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
        'players': game['players']
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
    print("Received data:", data)  # Log the received data to check if it contains both position and game_id
    game_id = data.get('game_id')
    position = data.get('position')

    if not game_id or not position:
      print("Missing game_id or position")  # Log if either is missing
      return jsonify({'error': 'Missing game_id or position'}), 400

        # Check if the game ID exists
    if game_id not in games:
      print("Game ID not found")  # Log if game_id is invalid
      return jsonify({'error': 'Game ID not found'}), 400

        # Get the game and board
    game = games[game_id]
    board = game['board']

        # Convert the position to a square (e.g., "e2" -> chess.E2)
    try:
      square = chess.parse_square(position)
    except ValueError:
      print("Invalid position")  # Log if the position is invalid
      return jsonify({'error': 'Invalid position'}), 400

        # Find all legal moves for the piece at the given square
    legal_moves = [
      chess.square_name(move.to_square) for move in board.legal_moves if move.from_square == square
    ]
    print("Legal Moves:", legal_moves)  # Log the legal moves found

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
                'status': 'waiting' if None in game['players'].values() else 'in-progress'
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
  
# Checkers API Endpoints

# Initialize a global checkers board object
checkersBoard = Board(variant="frysk", fen="startpos")


@app.route('/checkers/checkers_new_game', methods=['POST'])
def checkers_new_game():
    """
    Start a new checkers game.
    ---
    responses:
      200:
        description: A new game is started
        schema:
          type: object
          properties:
            message:
              type: string
              example: New game started
            fen:
              type: string
              example: "W:W18,21,22,23,24,25,26,27,28:B12,13,14,15,16,17,19,20,29"
            turn:
              type: string
              example: white
    """
    global checkersBoard
    data = request.get_json()
    variant = data.get('variant', 'standard')  # Default to 'standard' if not provided

    if variant == 'frysk':
        checkersBoard = Board(variant="frysk", fen="startpos")
    else:
        checkersBoard = Board()

    return jsonify({
        'message': f'New {variant} game started',
        'fen': checkersBoard.fen,
        'turn': 'white' if checkersBoard.turn == WHITE else 'black'
    })


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
    move_pdn = request.json.get('move')  # Get the PDN string ("29x27")
    print("Attempting move:", move_pdn)

    # Get legal moves as PDN strings
    legal_moves_pdn = [move.pdn_move for move in checkersBoard.legal_moves()]
    print("Legal moves (PDN):", legal_moves_pdn)

    # Check if the move is in the legal moves
    if move_pdn not in legal_moves_pdn:
        return jsonify({'error': 'Illegal move'}), 400

    # Find and apply the matching legal move
    for legal_move in checkersBoard.legal_moves():
        if legal_move.pdn_move == move_pdn:
            checkersBoard.push(legal_move)  # Apply the move
            break

    # Check if the current piece can make another capture
    next_legal_moves = [move.pdn_move for move in checkersBoard.legal_moves()]
    continue_capture = any('x' in move for move in next_legal_moves)

    return jsonify({
        'fen': checkersBoard.fen,
        'is_over': checkersBoard.is_over(),
        'turn': 'white' if checkersBoard.turn == WHITE else 'black',
        'is_capture': 'x' in move_pdn,
        'continue_capture': continue_capture,
        'legal_moves': next_legal_moves if continue_capture else []
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
    return jsonify({
        'fen': checkersBoard.fen,
        'is_over': checkersBoard.is_over(),
        'turn': 'red' if checkersBoard.turn == WHITE else 'black'
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
        # Parse the request body
        data = request.json
        position = data.get("position")

        if position is None:
            return jsonify({'error': 'Position is required'}), 400

        legal_moves = []
        for move in checkersBoard.legal_moves():
            # Extract starting square from move.pdn_move
            pdn_move = move.pdn_move  # Example: "34-28" or "34x28"
            start_square = int(pdn_move.split('x')[0] if 'x' in pdn_move else pdn_move.split('-')[0])

            # If the starting square matches the requested position, add the move
            if start_square == position:
                legal_moves.append(pdn_move)

        if not legal_moves:
            return jsonify({'legal_moves': []}), 200  # Return empty list if no moves

        return jsonify({'legal_moves': legal_moves})

    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 500
    
def generate_square_num_to_position_map():
    """
    Generates a mapping of square numbers (1-50) to board positions
    """
    mapping = {}
    square_num = 1
    files_even_rank = ['b', 'd', 'f', 'h', 'j']  # Dark squares in even ranks
    files_odd_rank = ['a', 'c', 'e', 'g', 'i']   # Dark squares in odd ranks

    for rank in range(10, 0, -1):  # Rows 10 to 1
        is_even = rank % 2 == 0  # Check if the rank is even
        files = files_even_rank if is_even else files_odd_rank

        for file in files:
            mapping[square_num] = f"{file}{rank}"  # Map square number to position
            square_num += 1

    return mapping
    
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
        # A set to hold unique starting positions of pieces with legal moves
        playable_pieces = set()

        # Loop through all legal moves and collect their starting squares
        for move in checkersBoard.legal_moves():
            pdn_move = move.pdn_move  # Example: "34-28" or "34x28"
            start_square = int(pdn_move.split('x')[0] if 'x' in pdn_move else pdn_move.split('-')[0])
            playable_pieces.add(start_square)

        # Convert square numbers to positions
        square_num_to_position_map = generate_square_num_to_position_map()
        playable_positions = [square_num_to_position_map[square] for square in playable_pieces]

        return jsonify({'playable_pieces': playable_positions}), 200

    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
