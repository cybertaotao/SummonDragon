import type { DifficultyKey } from './types';

export const WORLD_WIDTH = 390;
export const WORLD_HEIGHT = 844;
export const MAP_WIDTH = 780;
export const MAP_HEIGHT = 1350;

export interface CreatureDefinition {
  name: string;
  color: number;
  accent: number;
  radius: number;
  aspectRatio?: number;
  visualScale?: number;
}

export const CREATURES: CreatureDefinition[] = [
  { name: '小蝌蚪', color: 0x243b53, accent: 0x70d6b3, radius: 10 },
  { name: '小青蛙', color: 0x79c943, accent: 0xc9f27b, radius: 13 },
  { name: '小海龟', color: 0x34a47a, accent: 0xf0d26c, radius: 16 },
  { name: '小金鱼', color: 0xffb43a, accent: 0xffe27a, radius: 18 },
  { name: '锦鲤', color: 0xff715b, accent: 0xfff4dc, radius: 21 },
  { name: '电鳗', color: 0x7567d9, accent: 0xffe45c, radius: 23, aspectRatio: 1.45, visualScale: 1.08 },
  { name: '鲨鱼', color: 0x557da1, accent: 0xd8edf2, radius: 27, aspectRatio: 1.42, visualScale: 1.1 },
  { name: '鲸鱼', color: 0x3f72bd, accent: 0xa8e3ee, radius: 31, aspectRatio: 1.52, visualScale: 1.12 },
  { name: '蛟龙', color: 0x1c9b79, accent: 0xffd45a, radius: 35, aspectRatio: 1.58, visualScale: 1.16 },
  { name: '神龙', color: 0xf6c33b, accent: 0xff6f45, radius: 48, aspectRatio: 1.7, visualScale: 1.2 },
];

export interface DifficultyDefinition {
  label: string;
  targetWild: number;
  speedMultiplier: number;
  lowerWeight: number;
  equalWeight: number;
  higherWeight: number;
  spawnDelay: number;
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyDefinition> = {
  easy: {
    label: '简单',
    targetWild: 56,
    speedMultiplier: 1.05,
    lowerWeight: 0.42,
    equalWeight: 0.3,
    higherWeight: 0.28,
    spawnDelay: 560,
  },
  normal: {
    label: '普通',
    targetWild: 68,
    speedMultiplier: 1.3,
    lowerWeight: 0.38,
    equalWeight: 0.24,
    higherWeight: 0.38,
    spawnDelay: 420,
  },
  hard: {
    label: '困难',
    targetWild: 82,
    speedMultiplier: 1.58,
    lowerWeight: 0.32,
    equalWeight: 0.18,
    higherWeight: 0.5,
    spawnDelay: 310,
  },
};
