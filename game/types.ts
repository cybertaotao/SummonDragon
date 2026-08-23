export type DifficultyKey = 'easy' | 'normal' | 'hard';
export type GameResult = 'win' | 'lose';

export interface GameCallbacks {
  onProgress: (progress: number) => void;
  onReady: () => void;
  onEat: () => void;
  onDamaged: () => void;
  onResult: (result: GameResult) => void;
}

export interface GameController {
  start: (difficulty: DifficultyKey) => void;
  setPaused: (paused: boolean) => void;
  home: () => void;
  destroy: () => void;
}
