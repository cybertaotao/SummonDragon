'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DifficultyKey, GameController, GameResult } from '../game/types';
import { GameAudio } from './game-audio';

type Phase = 'loading' | 'home' | 'tutorial' | 'playing' | 'paused' | 'result';

const difficultyOptions: Array<{ key: DifficultyKey; label: string; note: string }> = [
  { key: 'easy', label: '简单', note: '轻松进化' },
  { key: 'normal', label: '普通', note: '平衡挑战' },
  { key: 'hard', label: '困难', note: '危险重重' },
];

export default function GameClient() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const [phase, setPhaseState] = useState<Phase>('loading');
  const [difficulty, setDifficulty] = useState<DifficultyKey>('hard');
  const [result, setResult] = useState<GameResult>('win');
  const [isLandscape, setIsLandscape] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    const audio = new GameAudio();
    audioRef.current = audio;
    const unlockAudio = () => audio.unlockAndResume();
    document.addEventListener('pointerdown', unlockAudio, { capture: true });
    document.addEventListener('keydown', unlockAudio, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', unlockAudio, { capture: true });
      document.removeEventListener('keydown', unlockAudio, { capture: true });
      audio.destroy();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let localController: GameController | null = null;

    const boot = async () => {
      if (!hostRef.current) return;
      const { createSummonDragonGame } = await import('../game/create-game');
      if (disposed || !hostRef.current) return;
      localController = createSummonDragonGame(hostRef.current, {
        onProgress: setLoadProgress,
        onReady: () => {
          setPhase('home');
          audioRef.current?.startBackground();
        },
        onEat: () => audioRef.current?.playEat(),
        onDamaged: () => audioRef.current?.playEated(),
        onResult: (nextResult) => {
          audioRef.current?.pauseBackground();
          if (nextResult === 'win') audioRef.current?.playWinner();
          else audioRef.current?.playFailed();
          setResult(nextResult);
          setPhase('result');
        },
      });
      controllerRef.current = localController;
    };

    void boot();
    return () => {
      disposed = true;
      localController?.destroy();
      controllerRef.current = null;
    };
  }, [setPhase]);

  useEffect(() => {
    const updateOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      if (landscape && (phaseRef.current === 'playing' || phaseRef.current === 'tutorial')) {
        controllerRef.current?.setPaused(true);
        audioRef.current?.pauseBackground();
        setPhase('paused');
      }
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, [setPhase]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && phaseRef.current === 'playing') {
        controllerRef.current?.setPaused(true);
        audioRef.current?.pauseBackground();
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setPhase]);

  const startGame = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    audioRef.current?.startBackground();
    controller.start(difficulty);
    const tutorialSeen = window.localStorage.getItem('summon-dragon-tutorial-seen') === '1';
    if (tutorialSeen) {
      controller.setPaused(false);
      setPhase('playing');
    } else {
      controller.setPaused(true);
      setPhase('tutorial');
    }
  }, [difficulty, setPhase]);

  const dismissTutorial = () => {
    window.localStorage.setItem('summon-dragon-tutorial-seen', '1');
    controllerRef.current?.setPaused(false);
    setPhase('playing');
  };

  const pauseGame = () => {
    controllerRef.current?.setPaused(true);
    audioRef.current?.pauseBackground();
    setPhase('paused');
  };

  const resumeGame = () => {
    if (isLandscape) return;
    controllerRef.current?.setPaused(false);
    audioRef.current?.startBackground();
    setPhase('playing');
  };

  const restartGame = () => {
    controllerRef.current?.start(difficulty);
    controllerRef.current?.setPaused(false);
    audioRef.current?.startBackground();
    setPhase('playing');
  };

  const returnHome = () => {
    controllerRef.current?.home();
    audioRef.current?.stopAll();
    audioRef.current?.startBackground();
    setPhase('home');
  };

  const toggleSound = () => {
    const enabled = !soundEnabledRef.current;
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    audioRef.current?.setEnabled(enabled);
    if (enabled && (phaseRef.current === 'playing' || phaseRef.current === 'home')) {
      audioRef.current?.startBackground();
    }
  };

  return (
    <main className="app-stage">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="game-frame" aria-label="召唤神龙游戏">
        <div ref={hostRef} id="game-host" className="game-host" />

        {phase === 'loading' && (
          <div className="screen-layer loading-screen">
            <div className="logo-orb" aria-hidden="true">龙</div>
            <h1 className="game-title small">召唤神龙</h1>
            <div className="loading-track" aria-label={`加载进度 ${Math.round(loadProgress * 100)}%`}>
              <span style={{ width: `${Math.max(8, loadProgress * 100)}%` }} />
            </div>
            <p>池塘正在苏醒…</p>
          </div>
        )}

        {phase === 'home' && (
          <div className="screen-layer home-screen">
            <div className="home-top">
              <span className="eyebrow">轻松 · 合成 · 进化</span>
              <h1 className="game-title">召唤<br /><em>神龙</em></h1>
              <p className="tagline">吞噬进化，最终召唤神龙</p>
            </div>
            <div className="start-card">
              <p className="section-label">选择难度</p>
              <div className="difficulty-grid" role="radiogroup" aria-label="选择难度">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`difficulty-button ${difficulty === option.key ? 'selected' : ''}`}
                    onClick={() => setDifficulty(option.key)}
                    role="radio"
                    aria-checked={difficulty === option.key}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.note}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="primary-button" onClick={startGame}>
                <span>开始游戏</span><b aria-hidden="true">→</b>
              </button>
              <p className="play-hint">自动前进 · 按住转向 · 躲避高阶</p>
            </div>
          </div>
        )}

        {phase !== 'loading' && (
          <button
            className={`sound-button ${soundEnabled ? '' : 'muted'}`}
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? '关闭声音' : '开启声音'}
            aria-pressed={!soundEnabled}
          >
            <span aria-hidden="true">♪</span>
          </button>
        )}

        {(phase === 'playing' || phase === 'tutorial') && (
          <button className="pause-button" type="button" onClick={pauseGame} aria-label="暂停游戏">
            <i /><i />
          </button>
        )}

        {phase === 'tutorial' && (
          <button type="button" className="screen-layer tutorial-screen" onClick={dismissTutorial}>
            <div className="gesture-hand" aria-hidden="true">☝</div>
            <div className="tutorial-card">
              <h2>自动前进，按住拖动转向</h2>
              <p>吞噬同级或更低级生物</p>
              <p>避开比自己更高级的生物</p>
              <span>点击任意位置开始</span>
            </div>
          </button>
        )}

        {phase === 'paused' && !isLandscape && (
          <div className="screen-layer modal-shade">
            <div className="dialog-card">
              <span className="dialog-kicker">游戏暂停</span>
              <h2>休息一下</h2>
              <button type="button" className="primary-button compact" onClick={resumeGame}>继续游戏</button>
              <button type="button" className="secondary-button" onClick={restartGame}>重新开始</button>
              <button type="button" className="text-button" onClick={returnHome}>返回首页</button>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="screen-layer modal-shade">
            <div className={`dialog-card result-card ${result}`}>
              <div className="result-icon" aria-hidden="true">{result === 'win' ? '龙' : '浪'}</div>
              <span className="dialog-kicker">{result === 'win' ? '召唤成功' : '本局结束'}</span>
              <h2>{result === 'win' ? '神龙现世！' : '召唤失败'}</h2>
              <button type="button" className="primary-button compact" onClick={restartGame}>再玩一次</button>
              <button type="button" className="text-button" onClick={returnHome}>返回首页</button>
            </div>
          </div>
        )}

        {isLandscape && phase !== 'home' && phase !== 'loading' && (
          <div className="screen-layer rotate-screen">
            <div className="phone-icon" aria-hidden="true"><span /></div>
            <h2>请旋转至竖屏游玩</h2>
            <p>竖屏体验更顺手</p>
          </div>
        )}
      </section>
    </main>
  );
}
