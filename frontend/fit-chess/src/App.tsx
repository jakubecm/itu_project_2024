import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainMenu from './Menu/MainMenu';
import NewGameMenu from './Menu/NewGameMenu';
import { MultiplayerGame } from './Multiplayer/MultiplayerGame';
import { Board } from './board/board';
import AIGameMenu from './Menu/AIGameMenu';
import TutorialList from './Tutorial/TutorialList';
import { TutorialBoard } from './Tutorial/Tutorial1';
import { CheckersBoard } from './Checkers/CheckersBoard';
import CheckersGameMenu from './Menu/CheckersGameMenu';
import { CheckersCustomSetup } from './Checkers/CheckersCustomSetup';
import CustomDifficultiesMenu from './Menu/DifficultyList';
import DifficultyForm from './Menu/DifficultyForm';
import ChallengeMenu from './Challenge/ChallengeMenu';
import ChallengeCreate from './Challenge/ChallengeCreate';


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
          <Route path="/checkers/new-game" element={< CheckersGameMenu />} />
          <Route path="/checkers" element={<CheckersBoard />} />
          <Route path="/checkers/custom-setup" element={<CheckersCustomSetup />} />
          <Route path="/difficulty-list" element={<CustomDifficultiesMenu />} />
          <Route path="/difficulty-list/create" element={<DifficultyForm />} />
          <Route path="/difficulty-list/edit/:level" element={<DifficultyForm />} />
          <Route path="/challenge" element={<ChallengeMenu />} />
          <Route path="/challenge/create" element={<ChallengeCreate/>} />
          <Route path="/challenge/edit/:id" element={<ChallengeCreate />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;