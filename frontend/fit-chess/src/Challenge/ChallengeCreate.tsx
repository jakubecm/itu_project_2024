import React, { useState, useEffect } from 'react';  
import './ChallengeCreate.css';
import { Piece } from '../board/piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Square } from '../board/square';
import { useParams, useNavigate } from 'react-router-dom';  

const SQUARE_SIZE = '80px';

const ChallengeCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>();  
  const navigate = useNavigate();  
  const [fen, setFen] = useState<string>('8/8/8/8/8/8/8/8'); 
  const [name, setName] = useState<string>(''); 
  const [error, setError] = useState<string>(''); 

 
  useEffect(() => {
    if (id) {
      fetch(`http://127.0.0.1:5000/get_challenge/${id}`)  
        .then(response => response.json())
        .then(data => {
          if (data.challenge) {
            setFen(data.challenge.fen);  
            setName(data.challenge.name);  
          }
        })
        .catch(err => console.error('Error fetching challenge data:', err));
    }
  }, [id]);  

  const updateFen = (pieces: { [key: string]: string }) => {
    const rows: string[] = Array(8).fill('');
    for (let row = 8; row >= 1; row--) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const position = `${String.fromCharCode(97 + col)}${row}`;
        const piece = pieces[position];
        if (piece) {
          if (emptyCount > 0) {
            rows[8 - row] += emptyCount.toString();
            emptyCount = 0;
          }
          rows[8 - row] += piece;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        rows[8 - row] += emptyCount.toString();
      }
    }
    setFen(rows.join('/'));

    sendBoardStateToBackend(rows.join('/'));
  };

  const handleMove = (from: string, to: string, type: string) => {
    const newPieces = { ...fenToPieces(fen) };
    if (from !== 'source') {
      delete newPieces[from]; 
    }
    newPieces[to] = type; 
    updateFen(newPieces);
  };

  const fenToPieces = (fen: string) => {
    const pieces: { [key: string]: string } = {};
    const rows = fen.split('/');
    rows.forEach((row, rowIndex) => {
      let colIndex = 0;
      row.split('').forEach((char) => {
        if (!isNaN(Number(char))) {
          colIndex += Number(char);
        } else {
          const position = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
          pieces[position] = char;
          colIndex++;
        }
      });
    });
    return pieces;
  };

  const sendBoardStateToBackend = async (fen: string) => {
    try {
      await fetch('http://127.0.0.1:5000/update_board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen }),
      });
    } catch (error) {
      console.error('Error sending board state to backend:', error);
    }
  };

  const resetBoard = async () => {
    const initialFen = '8/8/8/8/8/8/8/8'; 
    setFen(initialFen);  
    await sendBoardStateToBackend(initialFen);  
  };
  

  const renderSquares = () => {
    const pieces = fenToPieces(fen);
    const squares: JSX.Element[] = [];
    for (let row = 8; row >= 1; row--) {
      for (let col = 0; col < 8; col++) {
        const position = `${String.fromCharCode(97 + col)}${row}`;
        squares.push(
          <Square
            key={position}
            position={position}
            highlighted={false}
            selected={false}
            handleMove={handleMove}
            onClick={() => {}}
          >
            {pieces[position] && (
              <Piece
                type={pieces[position]}
                position={position}
                handlePick={() => {}}
                theme="regular"
              />
            )}
          </Square>
        );
      }
    }
    return squares;
  };

  const renderPieces = (isWhite: boolean, theme: string) => {
    const pieceTypes = isWhite
      ? ['P', 'N', 'B', 'R', 'Q', 'K'] 
      : ['p', 'n', 'b', 'r', 'q', 'k']; 

    return pieceTypes.map((type, index) => (
      <Piece
        key={`${type}-${index}-${isWhite ? 'white' : 'black'}`}
        type={type}
        position="source"
        handlePick={() => {}}
        theme={theme}
      />
    ));
  };

  const saveChallenge = async () => {
    if (!name.trim()) {
      setError('Please enter a challenge name.');
      return;
    }

    const method = id ? 'PUT' : 'POST';  // Use PUT for update, POST for new challenge
    const url = id ? `http://127.0.0.1:5000/update_challenge/${id}` : 'http://127.0.0.1:5000/save_challenge';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, name }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`Challenge saved/updated successfully with ID: ${data.challenge_id}`);
        navigate('/challenge'); 
      } else {
        console.error(`Failed to save challenge: ${data.error}`);
        setError(`Failed to save challenge: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving challenge:', error);
      setError('An error occurred while saving the challenge.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ justifyContent: 'center',     alignItems: 'center'}}>
        <div className="challenge-create">
          
  
          <div className="pieces-wrapper">
            <div className="piece-column">{renderPieces(false, 'regular')}</div>
            <div className="piece-column">{renderPieces(true, 'regular')}</div>
          </div>
  
          <div
            className="board-wrapper"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(8, ${SQUARE_SIZE})`,
            }}
          >
            {renderSquares()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
            <div className="challenge-info-wrapper">
              <label>
              Challenge Name:
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="challenge-name-input"
              />
              </label>
              <button onClick={saveChallenge} className="save-challenge-button">
                {id ? 'Update Challenge' : 'Save Challenge'}
              </button>
              <button onClick={resetBoard} className="reset-board-button">
                Reset Board
              </button>{error && <div className="error-message">{error}</div>}
            </div>  
          </div>
        </div>
      </div>
    </DndProvider>
  );
  
};

export default ChallengeCreate;
