import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainMenu from './Menu/MainMenu';
import NewGameMenu from './Menu/NewGameMenu';
import { MultiplayerGame } from './Multiplayer/MultiplayerGame';
import { Board } from './board/board';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/new-game" element={<NewGameMenu />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/board" element={<Board />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;