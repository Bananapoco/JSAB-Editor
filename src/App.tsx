import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { EditorOverlay } from './components/EditorOverlay';
import { CommunityHubOverlay } from './components/CommunityHubOverlay';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
            <EditorOverlay />
            <CommunityHubOverlay />
        </div>
    )
}

export default App
