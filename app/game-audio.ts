export class GameAudio {
  private readonly background: HTMLAudioElement;
  private readonly eat: HTMLAudioElement;
  private readonly eated: HTMLAudioElement;
  private readonly failed: HTMLAudioElement;
  private readonly winner: HTMLAudioElement;
  private enabled = true;
  private effectsPrimed = false;
  private backgroundRequested = false;

  constructor() {
    this.background = new Audio('/assets/music/backgroundmusic.mp3');
    this.background.loop = true;
    this.background.preload = 'auto';
    this.background.volume = 0.3;

    this.eat = new Audio('/assets/music/eat.mp3');
    this.eat.preload = 'auto';
    this.eat.volume = 0.5;

    this.eated = new Audio('/assets/music/eated-sound.mp3');
    this.eated.preload = 'auto';
    this.eated.volume = 0.65;

    this.failed = new Audio('/assets/music/failed.mp3');
    this.failed.preload = 'auto';
    this.failed.volume = 0.75;

    this.winner = new Audio('/assets/music/winner.mp3');
    this.winner.preload = 'auto';
    this.winner.volume = 0.75;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  startBackground() {
    this.backgroundRequested = true;
    if (!this.enabled) return;
    for (const audio of [this.failed, this.winner]) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.primeEffects();
    void this.background.play().catch(() => undefined);
  }

  pauseBackground() {
    this.backgroundRequested = false;
    this.background.pause();
  }

  unlockAndResume() {
    if (!this.enabled) return;
    this.primeEffects();
    if (this.backgroundRequested) void this.background.play().catch(() => undefined);
  }

  playEat() {
    if (!this.enabled) return;
    this.eat.currentTime = 0;
    void this.eat.play().catch(() => undefined);
  }

  playEated() {
    if (!this.enabled) return;
    this.eated.currentTime = 0;
    void this.eated.play().catch(() => undefined);
  }

  playFailed() {
    if (!this.enabled) return;
    this.background.pause();
    this.failed.currentTime = 0;
    void this.failed.play().catch(() => undefined);
  }

  playWinner() {
    if (!this.enabled) return;
    this.background.pause();
    this.winner.currentTime = 0;
    void this.winner.play().catch(() => undefined);
  }

  stopAll() {
    this.backgroundRequested = false;
    for (const audio of [this.background, this.eat, this.eated, this.failed, this.winner]) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  destroy() {
    this.stopAll();
    for (const audio of [this.background, this.eat, this.eated, this.failed, this.winner]) audio.removeAttribute('src');
  }

  private primeEffects() {
    if (this.effectsPrimed) return;
    this.effectsPrimed = true;
    for (const audio of [this.eat, this.eated, this.failed, this.winner]) {
      const volume = audio.volume;
      audio.muted = true;
      void audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = volume;
        })
        .catch(() => {
          audio.muted = false;
          audio.volume = volume;
        });
    }
  }
}
