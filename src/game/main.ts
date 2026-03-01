import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { CANVAS, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: CANVAS,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Scale.ENVELOP,
        autoCenter: Scale.CENTER_BOTH,
        width: 1024,
        height: 768,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false,
            fps: 60
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
