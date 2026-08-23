import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from './config';
import { SummonDragonScene } from './summon-dragon-scene';
import type { GameCallbacks, GameController } from './types';

export function createSummonDragonGame(parent: HTMLElement, callbacks: GameCallbacks): GameController {
  const scene = new SummonDragonScene(callbacks);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    parent,
    transparent: true,
    backgroundColor: '#20bec7',
    render: {
      antialias: true,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    scene: [scene],
  });

  return {
    start: (difficulty) => scene.startRun(difficulty),
    setPaused: (paused) => scene.setGamePaused(paused),
    home: () => scene.returnHome(),
    destroy: () => game.destroy(true),
  };
}
