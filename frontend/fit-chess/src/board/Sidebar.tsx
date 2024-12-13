// File: Sidebar.tsx
// Author: Milan Jakubec (xjakub41)
// Desc: Component for the game sidebar with move history and options to revert move, show hint, restart game and go back to menu.

import {useEffect, useRef} from 'react';
import './Sidebar.css';

interface SidebarProps {
    moveHistory: string[];
    onRevert: () => void;
    onHint: () => void;
}

const Sidebar = ({ moveHistory, onRevert, onHint }: SidebarProps) => {

    const endOfListRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Scroll the last element into view
        if (endOfListRef.current) {
            endOfListRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [moveHistory]);
    
    return (
        <div className="sidebar">

                <h3 className='sidebar-text'>Move History</h3>
                <div className="move-history">

                    {moveHistory.map((move, index) => (
                        <div className='sidebar-text' key={index} ref={index === moveHistory.length - 1 ? endOfListRef : null}>
                            {move}
                        </div>
                    ))}

                </div>

            <div className="controls">
                <button onClick={onRevert} className='sidebar-buttons'>Revert Move</button>
                <button onClick={onHint} className='sidebar-buttons'>Show Hint</button>
                <button onClick={() => window.location.reload()} className='sidebar-buttons'>Restart Game</button>
                <button onClick={() => window.location.href = '/'} className='sidebar-buttons'>Back to Menu</button>
            </div>
        </div>
    );
};

export default Sidebar;
