import Phaser from 'phaser';
import { CREATURES, DIFFICULTIES, MAP_HEIGHT, MAP_WIDTH } from './config';
import type { DifficultyDefinition } from './config';
import type { DifficultyKey, GameCallbacks } from './types';

interface Unit {
  sprite: Phaser.GameObjects.Sprite;
  level: number;
  radius: number;
  naturalScaleX: number;
  naturalScaleY: number;
  baseScaleX: number;
  baseScaleY: number;
  phase: number;
}

interface WildUnit extends Unit {
  vx: number;
  vy: number;
  turnAt: number;
}

type RunMode = 'idle' | 'playing' | 'result';

export class SummonDragonScene extends Phaser.Scene {
  private readonly callbacks: GameCallbacks;
  private team: Unit[] = [];
  private wild: WildUnit[] = [];
  private mode: RunMode = 'idle';
  private gamePaused = false;
  private difficulty: DifficultyDefinition = DIFFICULTIES.easy;
  private joystickOriginX = 0;
  private joystickOriginY = 0;
  private heading = -Math.PI / 2;
  private spawnClock = 0;
  private winSprite?: Phaser.GameObjects.Sprite;
  private cameraLevel = -1;

  constructor(callbacks: GameCallbacks) {
    super({ key: 'SummonDragonScene' });
    this.callbacks = callbacks;
  }

  preload() {
    this.load.on('progress', (value: number) => this.callbacks.onProgress(value));
    this.load.image('pond-background', '/assets/pond-background.png');
  }

  create() {
    this.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'pond-background')
      .setDisplaySize(MAP_WIDTH, MAP_HEIGHT)
      .setDepth(-20);

    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    this.createWaterDetails();
    for (let level = 0; level < CREATURES.length; level += 1) {
      this.createCreatureTexture(level);
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.mode !== 'playing' || this.gamePaused) return;
      this.joystickOriginX = pointer.x;
      this.joystickOriginY = pointer.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.mode !== 'playing' || this.gamePaused) return;
      this.updateHeadingFromJoystick(pointer);
    });
    this.input.on('pointerup', () => {
    });
    this.input.on('pointerupoutside', () => {
    });

    this.callbacks.onProgress(1);
    this.callbacks.onReady();
  }

  startRun(difficultyKey: DifficultyKey) {
    if (!this.sys.isActive()) return;
    this.clearRun();
    this.difficulty = DIFFICULTIES[difficultyKey];
    this.mode = 'playing';
    this.gamePaused = false;
    this.spawnClock = 0;
    this.heading = -Math.PI / 2;
    this.cameraLevel = -1;
    this.team.push(this.createUnit(0, MAP_WIDTH / 2, MAP_HEIGHT / 2, true));
    this.updateCameraZoom(0, false);
    this.cameras.main.startFollow(this.team[0].sprite, true, 0.09, 0.09);
    for (let i = 0; i < this.difficulty.targetWild; i += 1) this.spawnWild(true);
  }

  setGamePaused(paused: boolean) {
    this.gamePaused = paused;
  }

  returnHome() {
    this.clearRun();
    this.mode = 'idle';
    this.gamePaused = false;
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);
  }

  update(time: number, delta: number) {
    if (this.mode !== 'playing' || this.gamePaused || this.team.length === 0) return;
    const dt = Math.min(delta / 1000, 0.04);

    this.updatePlayer(dt, time);
    this.updateWild(dt, time);
    this.resolvePlayerCollisions();
    this.resolveWildCollisions();

    this.spawnClock += delta;
    if (this.wild.length < this.difficulty.targetWild && this.spawnClock >= this.difficulty.spawnDelay) {
      this.spawnClock = 0;
      this.spawnWild(false);
    }
  }

  private updateHeadingFromJoystick(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.joystickOriginX;
    const dy = pointer.y - this.joystickOriginY;
    if (Math.hypot(dx, dy) < 7) return;
    this.heading = Math.atan2(dy, dx);
  }

  private updatePlayer(dt: number, time: number) {
    const head = this.team[0];
    const movementSpeed = 72;
    head.sprite.x += Math.cos(this.heading) * movementSpeed * dt;
    head.sprite.y += Math.sin(this.heading) * movementSpeed * dt;
    const headMargin = head.radius + 12;
    if (head.sprite.x <= headMargin || head.sprite.x >= MAP_WIDTH - headMargin) {
      this.heading = Math.PI - this.heading;
    }
    if (head.sprite.y <= headMargin || head.sprite.y >= MAP_HEIGHT - headMargin) {
      this.heading = -this.heading;
    }
    head.sprite.x = Phaser.Math.Clamp(head.sprite.x, headMargin, MAP_WIDTH - headMargin);
    head.sprite.y = Phaser.Math.Clamp(head.sprite.y, headMargin, MAP_HEIGHT - headMargin);
    head.sprite.rotation = this.heading;

    for (let index = 1; index < this.team.length; index += 1) {
      const current = this.team[index];
      const slot = index - 1;
      const row = Math.floor(slot / 3);
      const column = slot % 3;
      const backward = 22 + row * 12;
      const lateral = (column - 1) * 14;
      const targetX = head.sprite.x - Math.cos(this.heading) * backward - Math.sin(this.heading) * lateral;
      const targetY = head.sprite.y - Math.sin(this.heading) * backward + Math.cos(this.heading) * lateral;
      const followFactor = Math.min(1, dt * 9);
      current.sprite.x = Phaser.Math.Linear(current.sprite.x, targetX, followFactor);
      current.sprite.y = Phaser.Math.Linear(current.sprite.y, targetY, followFactor);
      current.sprite.rotation = this.heading + Math.sin(time * 0.004 + current.phase) * 0.12;
    }

    for (const member of this.team) {
      const breathe = 1 + Math.sin(time * 0.006 + member.phase) * 0.035;
      member.sprite.setScale(member.baseScaleX * breathe, member.baseScaleY / breathe);
      member.sprite.setAlpha(1);
    }
  }

  private updateWild(dt: number, time: number) {
    for (const unit of this.wild) {
      if (time >= unit.turnAt) {
        const angle = Math.atan2(unit.vy, unit.vx) + Phaser.Math.FloatBetween(-0.85, 0.85);
        const speed = Phaser.Math.FloatBetween(24, 45) * this.difficulty.speedMultiplier;
        unit.vx = Math.cos(angle) * speed;
        unit.vy = Math.sin(angle) * speed;
        unit.turnAt = time + Phaser.Math.Between(900, 2300);
      }

      unit.sprite.x += unit.vx * dt;
      unit.sprite.y += unit.vy * dt;
      const margin = unit.radius + 8;
      if (unit.sprite.x < margin || unit.sprite.x > MAP_WIDTH - margin) {
        unit.vx *= -1;
        unit.sprite.x = Phaser.Math.Clamp(unit.sprite.x, margin, MAP_WIDTH - margin);
      }
      if (unit.sprite.y < margin || unit.sprite.y > MAP_HEIGHT - margin) {
        unit.vy *= -1;
        unit.sprite.y = Phaser.Math.Clamp(unit.sprite.y, margin, MAP_HEIGHT - margin);
      }
      unit.sprite.rotation = Math.atan2(unit.vy, unit.vx);
      const swim = 1 + Math.sin(time * 0.008 + unit.phase) * 0.045;
      unit.sprite.setScale(unit.baseScaleX * swim, unit.baseScaleY / swim);
    }
  }

  private resolvePlayerCollisions() {
    if (this.team.length === 0) return;
    const highestLevel = this.team[0].level;

    for (const wildUnit of [...this.wild]) {
      let contactIndex = -1;
      for (let index = 0; index < this.team.length; index += 1) {
        const member = this.team[index];
        const distance = Phaser.Math.Distance.Between(
          wildUnit.sprite.x,
          wildUnit.sprite.y,
          member.sprite.x,
          member.sprite.y,
        );
        const memberRadius = member.radius * (index === 0 ? 1 : 0.62);
        if (distance < (wildUnit.radius + memberRadius) * 0.78) {
          contactIndex = index;
          break;
        }
      }

      if (contactIndex < 0) continue;
      if (wildUnit.level <= highestLevel) {
        const x = wildUnit.sprite.x;
        const y = wildUnit.sprite.y;
        const eatenLevel = wildUnit.level;
        this.removeWild(wildUnit);
        this.addToTeam(eatenLevel, x, y);
        this.showBurst(x, y, CREATURES[eatenLevel].accent, 5);
        this.callbacks.onEat();
      } else {
        this.damageTeam(contactIndex);
        break;
      }
    }
  }

  private resolveWildCollisions() {
    const removed = new Set<WildUnit>();
    for (let left = 0; left < this.wild.length; left += 1) {
      const a = this.wild[left];
      if (removed.has(a)) continue;
      for (let right = left + 1; right < this.wild.length; right += 1) {
        const b = this.wild[right];
        if (removed.has(b) || a.level === b.level) continue;
        const distance = Phaser.Math.Distance.Between(a.sprite.x, a.sprite.y, b.sprite.x, b.sprite.y);
        if (distance >= (a.radius + b.radius) * 0.68) continue;
        const prey = a.level > b.level ? b : a;
        removed.add(prey);
        this.showBurst(prey.sprite.x, prey.sprite.y, CREATURES[prey.level].accent, 3);
        if (prey === a) break;
      }
    }
    for (const unit of removed) this.removeWild(unit);
  }

  private addToTeam(level: number, x: number, y: number) {
    this.team.push(this.createUnit(level, x, y, true));
    const counts = new Array(CREATURES.length).fill(0) as number[];
    for (const member of this.team) counts[member.level] += 1;
    let merged = false;
    for (let current = 0; current < CREATURES.length - 1; current += 1) {
      const carry = Math.floor(counts[current] / 3);
      if (carry > 0) {
        counts[current] %= 3;
        counts[current + 1] += carry;
        merged = true;
      }
    }

    if (counts[CREATURES.length - 1] > 0) {
      this.triggerWin();
      return;
    }
    if (merged) {
      const head = this.team[0];
      this.showBurst(head.sprite.x, head.sprite.y, 0xffef86, 11);
      this.rebuildTeam(counts);
    } else {
      this.sortTeam();
    }
  }

  private damageTeam(contactIndex: number) {
    const doomed = contactIndex === 0 ? this.team.splice(0, 1) : this.team.splice(contactIndex);
    const hit = doomed[0];
    if (hit) this.showBurst(hit.sprite.x, hit.sprite.y, 0xff775f, 10);
    for (const unit of doomed) unit.sprite.destroy();
    this.callbacks.onDamaged();
    this.sortTeam();

    if (this.team.length === 0) this.triggerLose();
  }

  private rebuildTeam(counts: number[]) {
    const oldHead = this.team[0];
    const x = oldHead?.sprite.x ?? MAP_WIDTH / 2;
    const y = oldHead?.sprite.y ?? MAP_HEIGHT / 2;
    const rotation = oldHead?.sprite.rotation ?? 0;
    for (const member of this.team) member.sprite.destroy();
    this.team = [];

    for (let level = CREATURES.length - 2; level >= 0; level -= 1) {
      for (let amount = 0; amount < counts[level]; amount += 1) {
        const member = this.createUnit(
          level,
          x,
          y,
          true,
        );
        member.sprite.rotation = rotation;
        this.team.push(member);
      }
    }
    this.applyTeamPresentation();
    if (this.team[0]) this.cameras.main.startFollow(this.team[0].sprite, true, 0.09, 0.09);
  }

  private sortTeam() {
    this.team.sort((a, b) => b.level - a.level);
    this.applyTeamPresentation();
    if (this.team[0]) this.cameras.main.startFollow(this.team[0].sprite, true, 0.09, 0.09);
  }

  private applyTeamPresentation() {
    this.team.forEach((unit, index) => {
      const compactScale = index === 0 ? 1 : 0.62;
      unit.baseScaleX = unit.naturalScaleX * compactScale;
      unit.baseScaleY = unit.naturalScaleY * compactScale;
      unit.sprite.setScale(unit.baseScaleX, unit.baseScaleY).setAlpha(index === 0 ? 1 : 0.9);
      unit.sprite.setDepth(index === 0 ? 140 : 110 - index);
    });
    if (this.team[0]) this.updateCameraZoom(this.team[0].level, true);
  }

  private updateCameraZoom(level: number, animate: boolean) {
    if (level === this.cameraLevel) return;
    this.cameraLevel = level;
    const targetZoom = Phaser.Math.Clamp(1.52 - level * 0.04, 1.2, 1.52);
    if (animate) this.cameras.main.zoomTo(targetZoom, 420, 'Sine.easeOut');
    else this.cameras.main.setZoom(targetZoom);
  }

  private spawnWild(initial: boolean) {
    if (this.mode !== 'playing' || this.team.length === 0) return;
    const level = this.chooseSpawnLevel();
    const head = this.team[0];
    const firstAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const firstDistance = Phaser.Math.Between(90, 500);
    let x = Phaser.Math.Clamp(head.sprite.x + Math.cos(firstAngle) * firstDistance, 26, MAP_WIDTH - 26);
    let y = Phaser.Math.Clamp(head.sprite.y + Math.sin(firstAngle) * firstDistance, 26, MAP_HEIGHT - 30);
    for (let tries = 0; tries < 8; tries += 1) {
      if (Phaser.Math.Distance.Between(x, y, head.sprite.x, head.sprite.y) > (initial ? 90 : 70)) break;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(90, 500);
      x = Phaser.Math.Clamp(head.sprite.x + Math.cos(angle) * distance, 26, MAP_WIDTH - 26);
      y = Phaser.Math.Clamp(head.sprite.y + Math.sin(angle) * distance, 26, MAP_HEIGHT - 30);
    }

    const unit = this.createUnit(level, x, y, false) as WildUnit;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.FloatBetween(24, 45) * this.difficulty.speedMultiplier;
    unit.vx = Math.cos(angle) * speed;
    unit.vy = Math.sin(angle) * speed;
    unit.turnAt = this.time.now + Phaser.Math.Between(700, 2200);
    this.wild.push(unit);
  }

  private chooseSpawnLevel() {
    const playerLevel = this.team[0]?.level ?? 0;
    const roll = Math.random();
    if (roll < this.difficulty.lowerWeight && playerLevel > 0) {
      return Phaser.Math.Between(Math.max(0, playerLevel - 3), playerLevel - 1);
    }
    if (roll < this.difficulty.lowerWeight + this.difficulty.equalWeight) return playerLevel;
    if (playerLevel < CREATURES.length - 2) {
      return Phaser.Math.Between(playerLevel + 1, Math.min(CREATURES.length - 2, playerLevel + 3));
    }
    return Phaser.Math.Between(Math.max(0, playerLevel - 2), playerLevel);
  }

  private createUnit(level: number, x: number, y: number, player: boolean): Unit {
    const definition = CREATURES[level];
    const sprite = this.add.sprite(x, y, `creature-${level}`);
    const visualScale = definition.visualScale ?? 1;
    const aspectRatio = definition.aspectRatio ?? 1;
    const diameter = definition.radius * (player ? 2.7 : 2.45) * visualScale;
    sprite.setDisplaySize(diameter * aspectRatio, diameter);
    sprite.setDepth(player ? 100 : 10 + level);
    return {
      sprite,
      level,
      radius: definition.radius * visualScale,
      naturalScaleX: sprite.scaleX,
      naturalScaleY: sprite.scaleY,
      baseScaleX: sprite.scaleX,
      baseScaleY: sprite.scaleY,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    };
  }

  private removeWild(unit: WildUnit) {
    const index = this.wild.indexOf(unit);
    if (index >= 0) this.wild.splice(index, 1);
    unit.sprite.destroy();
  }

  private triggerWin() {
    if (this.mode !== 'playing') return;
    this.mode = 'result';
    for (const member of this.team) member.sprite.destroy();
    this.team = [];
    const center = this.cameras.main.midPoint;
    this.winSprite = this.add.sprite(center.x, center.y, 'creature-9').setDepth(250);
    this.winSprite.setDisplaySize(190, 190).setAlpha(0).setScale(0.25);
    this.tweens.add({
      targets: this.winSprite,
      alpha: 1,
      scaleX: 1.4,
      scaleY: 1.4,
      angle: 360,
      duration: 720,
      ease: 'Back.Out',
    });
    this.showBurst(center.x, center.y, 0xffe066, 22);
    this.time.delayedCall(650, () => this.callbacks.onResult('win'));
  }

  private triggerLose() {
    if (this.mode !== 'playing') return;
    this.mode = 'result';
    this.time.delayedCall(280, () => this.callbacks.onResult('lose'));
  }

  private clearRun() {
    for (const member of this.team) member.sprite.destroy();
    for (const unit of this.wild) unit.sprite.destroy();
    this.team = [];
    this.wild = [];
    this.winSprite?.destroy();
    this.winSprite = undefined;
  }

  private showBurst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.9).setDepth(220);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(16, 42);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(260, 480),
        ease: 'Quad.Out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private createWaterDetails() {
    for (let i = 0; i < 18; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(20, MAP_WIDTH - 20),
        Phaser.Math.Between(20, MAP_HEIGHT - 20),
        Phaser.Math.Between(2, 6),
        0xffffff,
        Phaser.Math.FloatBetween(0.08, 0.2),
      ).setDepth(-8);
      this.tweens.add({
        targets: bubble,
        y: bubble.y - Phaser.Math.Between(28, 70),
        alpha: 0,
        duration: Phaser.Math.Between(2400, 5200),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2800),
      });
    }
  }

  private createCreatureTexture(level: number) {
    const key = `creature-${level}`;
    if (this.textures.exists(key)) return;
    const graphics = this.add.graphics().setVisible(false);
    const { color, accent } = CREATURES[level];
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(24).color;

    graphics.fillStyle(0x133c46, 0.13);
    graphics.fillEllipse(61, 70, 76, 38);
    graphics.fillStyle(color, 1);

    if (level === 0) {
      graphics.lineStyle(13, color, 1);
      graphics.beginPath(); graphics.moveTo(59, 64); graphics.lineTo(45, 66); graphics.lineTo(32, 55); graphics.lineTo(14, 58); graphics.strokePath();
      graphics.fillCircle(70, 61, 20);
    } else if (level === 1) {
      graphics.fillEllipse(63, 64, 52, 40);
      graphics.lineStyle(8, dark, 1);
      graphics.beginPath(); graphics.moveTo(47, 76); graphics.lineTo(33, 91); graphics.moveTo(78, 76); graphics.lineTo(93, 91); graphics.strokePath();
      graphics.fillCircle(49, 47, 10); graphics.fillCircle(78, 47, 10);
    } else if (level === 2) {
      graphics.fillCircle(98, 64, 11);
      graphics.fillEllipse(63, 64, 58, 47);
      graphics.fillStyle(accent, 1); graphics.fillEllipse(62, 64, 43, 34);
      graphics.fillStyle(color, 1);
      graphics.fillEllipse(46, 38, 18, 11); graphics.fillEllipse(46, 90, 18, 11);
      graphics.fillEllipse(80, 38, 18, 11); graphics.fillEllipse(80, 90, 18, 11);
    } else if (level === 3 || level === 4) {
      graphics.fillTriangle(27, 64, 7, 41, 7, 87);
      graphics.fillEllipse(68, 64, level === 4 ? 72 : 62, level === 4 ? 36 : 42);
      graphics.fillStyle(accent, 1);
      graphics.fillTriangle(62, 68, 42, 94, 75, 82);
      if (level === 4) {
        graphics.fillCircle(61, 55, 9); graphics.fillCircle(82, 72, 7);
      }
    } else if (level === 5) {
      graphics.lineStyle(24, color, 1);
      graphics.beginPath(); graphics.moveTo(18, 76); graphics.lineTo(36, 49); graphics.lineTo(58, 52); graphics.lineTo(78, 77); graphics.lineTo(108, 53); graphics.strokePath();
      graphics.lineStyle(5, accent, 1);
      graphics.beginPath(); graphics.moveTo(25, 69); graphics.lineTo(41, 49); graphics.lineTo(58, 55); graphics.lineTo(77, 75); graphics.lineTo(101, 57); graphics.strokePath();
      graphics.fillCircle(106, 52, 14);
    } else if (level === 6) {
      graphics.fillTriangle(25, 64, 4, 43, 4, 84);
      graphics.fillEllipse(68, 64, 79, 37);
      graphics.fillTriangle(65, 49, 80, 23, 91, 53);
      graphics.fillStyle(accent, 1); graphics.fillTriangle(88, 65, 111, 54, 108, 72);
    } else if (level === 7) {
      graphics.fillTriangle(26, 64, 7, 43, 10, 65); graphics.fillTriangle(26, 64, 7, 85, 10, 65);
      graphics.fillEllipse(71, 64, 84, 48);
      graphics.fillStyle(accent, 1); graphics.fillEllipse(79, 72, 51, 21);
      graphics.lineStyle(4, accent, 0.9);
      graphics.beginPath(); graphics.moveTo(84, 40); graphics.lineTo(84, 27); graphics.moveTo(84, 28); graphics.lineTo(76, 19); graphics.moveTo(84, 28); graphics.lineTo(92, 19); graphics.strokePath();
    } else {
      graphics.lineStyle(level === 9 ? 30 : 24, color, 1);
      graphics.beginPath(); graphics.moveTo(15, 74); graphics.lineTo(31, 43); graphics.lineTo(50, 44); graphics.lineTo(70, 80); graphics.lineTo(87, 76); graphics.lineTo(105, 52); graphics.strokePath();
      graphics.fillCircle(106, 51, level === 9 ? 20 : 16);
      graphics.fillStyle(accent, 1);
      graphics.fillTriangle(102, 37, 105, 15, 114, 39); graphics.fillTriangle(91, 43, 88, 22, 101, 40);
      graphics.fillCircle(42, 54, 6); graphics.fillCircle(66, 77, 6);
    }

    graphics.fillStyle(0xffffff, 1);
    const eyeX = level === 0 ? 78 : level === 1 ? 78 : level === 2 ? 101 : level === 5 ? 110 : level >= 8 ? 112 : 94;
    const eyeY = level === 1 ? 44 : level === 2 ? 61 : level === 5 ? 49 : level >= 8 ? 46 : 57;
    graphics.fillCircle(eyeX, eyeY, level >= 7 ? 5 : 4);
    graphics.fillStyle(0x17313c, 1);
    graphics.fillCircle(eyeX + 1, eyeY, level >= 7 ? 2.4 : 2);
    graphics.lineStyle(3, 0xffffff, 0.35);
    graphics.beginPath(); graphics.moveTo(55, 49); graphics.lineTo(76, 44); graphics.strokePath();
    graphics.generateTexture(key, 128, 128);
    graphics.destroy();
  }
}
