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

@app.route('/new_game', methods=['POST'])
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

    # Return the updated board state
    return jsonify({
        'fen': board.fen(),  # Updated board position in FEN format
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check()
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
    Make a move for the AI opponent
    ---
    responses:
      200:
        description: AI move is made and the game state is updated
        schema:
          type: object
          properties:
            fen:
              type: string
            is_checkmate:
              type: boolean
            is_stalemate:
              type: boolean
            ai_move:
              type: string
            turn:
              type: string
    """
    global board
    engine = chess.engine.SimpleEngine.popen_uci("/usr/games/stockfish")  # Assuming Stockfish is installed
    ai_move = engine.play(board, chess.engine.Limit(time=2.0))  # AI makes its move in 2 seconds
    board.push(ai_move.move)
    
    engine.quit()

    return jsonify({
        'fen': board.fen(),  # Updated board position in FEN format
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'ai_move': board.san(ai_move.move),  # Send AI move in SAN format
        'turn': 'white' if board.turn == chess.WHITE else 'black'
    })

@app.route('/legal_moves', methods=['POST'])
def legal_moves():
    """
    Get all legal moves for a piece at a specific position
    ---
    parameters:
      - name: position
        in: query
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
        move.uci() for move in board.legal_moves if move.from_square == square
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
    """
    Make a move in a multiplayer chess game
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - game_id
            - move
          properties:
            game_id:
              type: string
              description: The game ID to make a move in
            move:
              type: string
              description: The chess move in UCI format (e.g., "e2e4")
    responses:
      200:
        description: Move is accepted and game state updated
        schema:
          type: object
          properties:
            fen:
              type: string
              example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            is_checkmate:
              type: boolean
              example: false
            is_stalemate:
              type: boolean
              example: false
            turn:
              type: string
              example: "white"
            is_check:
              type: boolean
              example: false
      400:
        description: Invalid move or game state
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Game ID not found"
    """
    try:
        # Parse incoming JSON safely
        data = request.get_json()
        if data is None:
            raise ValueError("No JSON data found")
    except Exception as e:
        return jsonify({'error': f"Invalid JSON: {str(e)}"}), 400

    # Extract game_id and move from the request
    game_id = data.get('game_id')
    move_uci = data.get('move')

    # Validate the presence of required fields
    if not game_id or not move_uci:
        return jsonify({'error': 'game_id and move are required'}), 400

    # Check if the game ID exists
    if game_id not in games:
        return jsonify({'error': 'Game ID not found'}), 400

    # Get the game and the board
    game = games[game_id]
    board = game['board']
    current_turn = 'white' if board.turn == chess.WHITE else 'black'
    
    # Verify that the player making the move is the correct player
    player_ip = request.remote_addr
    if game['players'][current_turn] != player_ip:
        return jsonify({'error': 'It is not your turn or you are not a player in this game'}), 400

    # Try to make the move
    try:
        move = chess.Move.from_uci(move_uci)
        if move in board.legal_moves:
            board.push(move)  # Make the move on the board
        else:
            return jsonify({'error': 'Illegal move'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Check if the game has ended
    if board.is_checkmate() or board.is_stalemate():
        # Delete the game from memory if it ends
        del games[game_id]
        return jsonify({
            'fen': board.fen(),
            'is_checkmate': board.is_checkmate(),
            'is_stalemate': board.is_stalemate(),
            'turn': 'white' if board.turn == chess.WHITE else 'black',
            'is_check': board.is_check(),
            'message': 'Game over. The game has been deleted.'
        })

    # Return the updated game state
    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'is_check': board.is_check()
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

    return jsonify({
        'fen': board.fen(),
        'is_checkmate': board.is_checkmate(),
        'is_stalemate': board.is_stalemate(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
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
      move.uci() for move in board.legal_moves if move.from_square == square
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
