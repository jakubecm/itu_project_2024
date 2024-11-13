from flask import Flask, jsonify, request
import chess
import chess.engine
from flasgger import Swagger
from flask import Flask
from flask_cors import CORS
import uuid
import socket

app = Flask(__name__)
CORS(app)  # This will allow all domains to make requests
swagger = Swagger(app)

# Create a global chess board object to represent the current game
board = chess.Board()

STOCKFISH_PATH = "C:\stockfish\stockfish-windows-x86-64-avx2.exe"

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
    board = chess.Board()  # Reset the board to the starting position
    return jsonify({
        'message': 'New game started',
        'fen': board.fen(),  # Return the FEN notation for the starting position
        'turn': 'white'
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
        'check_square': check_square
    })

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
        'is_check': board.is_check()
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
        'is_check': board.is_check()
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
        'turn': 'white' if board.turn == chess.WHITE else 'black'
    })

@app.route('/ai_move', methods=['POST'])
def ai_move():
    """
    AI move endpoint which takes skill level and depth as parameters.
    """
    global board
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
                'turn': 'white' if board.turn == chess.WHITE else 'black'
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
