import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainMenu from './Menu/MainMenu';
import NewGameMenu from './Menu/NewGameMenu';
import { MultiplayerGame } from './Multiplayer/MultiplayerGame';
import { Board } from './board/board';
import AIGameMenu from './Menu/AIGameMenu';
import TutorialList from './Tutorial/TutorialList';
import { TutorialBoard } from './Tutorial/Tutorial1';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/new-game" element={<NewGameMenu />} />
          <Route path="/new-game/difficulty" element={< AIGameMenu/>} />
          <Route path="/board/:difficulty" element={<Board />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/board" element={<Board />} />
          <Route path="/tutorial" element={<TutorialList />} />
          <Route path="/tutorial1" element={< TutorialBoard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;