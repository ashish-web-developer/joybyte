import * as Phaser from "phaser";
import {
  BRIDGE_BARRIER,
  BRIDGE_PANEL,
  BRIDGE_SPAN,
  buildMountainRoadPath,
  CHECKPOINTS,
  DAMAGED_GUARDRAILS,
  HIDDEN_CACHE,
  isMountainObstacle,
  isOnMountainRoad,
  isOnSlipperyRoad,
  LANDSLIDE_ROCKS,
  MOUNTAIN_EXIT,
  MOUNTAIN_HEIGHT,
  MOUNTAIN_ROADS,
  MOUNTAIN_ROAD_CENTRELINES,
  MOUNTAIN_START,
  MOUNTAIN_WIDTH,
  POWER_SWITCH_A,
  POWER_SWITCH_B,
  ROCKFALL_ZONES,
  SLIPPERY_ROADS,
  getForestTrees,
} from "./mountain-pass-world";
import type { RockfallConfig } from "./mountain-pass-world";
import type { Point } from "./world";
import { BridgeRepair, HiddenCache, MountainPowerSwitch } from "./mountain-puzzle";
import { RoadBarrier } from "./puzzle-objects";
import {
  playArrivalSound,
  playBridgeRepairSound,
  playRockImpactSound,
  playRockfallWarningSound,
  playSwitchSound,
} from "./audio-feedback";
import { MOUNTAIN_CACHE_BONUS } from "./progression";
import {
  createVehicle,
  getVehicleCollisionPoints,
  getVehicleCorners,
  stepVehicle,
  VEHICLE_LENGTH,
  VEHICLE_WIDTH,
} from "./vehicle-system";
import type {
  DrivingControls,
  Vehicle,
} from "./vehicle-system";
import type { GameSnapshot, TouchControl } from "./EscapeRouteScene";

type RockfallPhase = "ready" | "warning" | "falling" | "blocked" | "spent";

type Rockfall = {
  config: RockfallConfig;
  phase: RockfallPhase;
  timer: number;
  indicator: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Graphics;
  message: Phaser.GameObjects.Text;
  rock: Phaser.GameObjects.Container;
  warningLamp: Phaser.GameObjects.Container;
};

type SkidMark = {
  from: Point;
  to: Point;
  life: number;
};

export type MountainPassSnapshot = GameSnapshot & {
  switchAActivated: boolean;
  switchBActivated: boolean;
  bridgeRepairing: boolean;
  bridgeRepaired: boolean;
  nearSwitchA: boolean;
  nearSwitchB: boolean;
  nearBridgePanel: boolean;
  canRepairBridge: boolean;
  checkpointIndex: number;
  checkpointActivated: boolean;
  cacheCollected: boolean;
  nearCache: boolean;
  bonusPoints: number;
  fallingRockWarning: boolean;
  hazardMessage: string;
  onSlipperyRoad: boolean;
};

const ROCKFALL_WARNING_SECONDS = 2.8;
const ROCKFALL_BLOCK_SECONDS = 7;
const CHECKPOINT_ANGLES = [
  MOUNTAIN_START.angle,
  (-3 * Math.PI) / 4,
  -Math.PI / 3,
];
const RIVER_CENTERLINE: Point[] = [
  { x: 2030, y: 790 },
  { x: 2070, y: 930 },
  { x: 2010, y: 1070 },
  { x: 2105, y: 1220 },
  { x: 2050, y: 1390 },
];

function getPolylineLength(points: Point[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Phaser.Math.Distance.Between(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
  }
  return length;
}

function pointAtPolylineDistance(points: Point[], distance: number): Point {
  let remaining = distance;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    if (remaining <= length || index === points.length - 1) {
      const progress = length === 0 ? 0 : Phaser.Math.Clamp(remaining / length, 0, 1);
      return {
        x: Phaser.Math.Linear(from.x, to.x, progress),
        y: Phaser.Math.Linear(from.y, to.y, progress),
      };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

function offsetPolyline(points: Point[], offset: number): Point[] {
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x - (dy / length) * offset,
      y: point.y + (dx / length) * offset,
    };
  });
}

function getRockVertices(x: number, y: number, radius: number, seed: number) {
  return Array.from({ length: 9 }, (_, index) => {
    const angle = (index / 9) * Math.PI * 2 + seed * 0.19;
    const scale = 0.76 + ((index * 7 + seed * 3) % 5) * 0.035;
    return {
      x: x + Math.cos(angle) * radius * scale,
      y: y + Math.sin(angle) * radius * scale,
    };
  });
}

export default class MountainPassScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private car!: Phaser.GameObjects.Container;
  private powerA = new MountainPowerSwitch(POWER_SWITCH_A);
  private powerB = new MountainPowerSwitch(POWER_SWITCH_B);
  private bridge = new BridgeRepair(BRIDGE_PANEL);
  private bridgeBarrier = new RoadBarrier(BRIDGE_BARRIER);
  private cacheCollectible = new HiddenCache(HIDDEN_CACHE);
  private switchAIndicator!: Phaser.GameObjects.Graphics;
  private switchBIndicator!: Phaser.GameObjects.Graphics;
  private switchALabel!: Phaser.GameObjects.Text;
  private switchBLabel!: Phaser.GameObjects.Text;
  private bridgeContainer!: Phaser.GameObjects.Container;
  private bridgeDeck!: Phaser.GameObjects.Container;
  private bridgeLabel!: Phaser.GameObjects.Text;
  private bridgePanelIndicator!: Phaser.GameObjects.Graphics;
  private cacheContainer!: Phaser.GameObjects.Container;
  private checkpointIndicators: Phaser.GameObjects.Graphics[] = [];
  private checkpointLabels: Phaser.GameObjects.Text[] = [];
  private hazards: Rockfall[] = [];
  private swayingTrees: Point[] = [];
  private waterGlints: Phaser.GameObjects.Graphics[] = [];
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private skidGraphics!: Phaser.GameObjects.Graphics;
  private skidMarks: SkidMark[] = [];
  private previousSkidPoints: [Point, Point] | null = null;
  private dustAccumulator = 0;
  private skidRenderAccumulator = 0;
  private touchControls: DrivingControls = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
  };
  private keys!: Record<TouchControl, Phaser.Input.Keyboard.Key[]>;
  private interactionKeys!: Phaser.Input.Keyboard.Key[];
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private pauseKeyWasDown = false;
  private elapsed = 0;
  private hudAccumulator = 0;
  private collisions = 0;
  private collisionActive = false;
  private paused = false;
  private won = false;
  private levelCompleted = false;
  private nearSwitchA = false;
  private nearSwitchB = false;
  private nearBridgePanel = false;
  private nearCache = false;
  private onSlipperyRoad = false;
  private checkpointIndex = 0;
  private respawnMessageTimer = 0;
  private respawnLockTimer = 0;
  private onHudUpdate: (snapshot: MountainPassSnapshot) => void;
  private readonly carCorners = Array.from({ length: 4 }, () => ({
    x: 0,
    y: 0,
  }));

  constructor(onHudUpdate: (snapshot: MountainPassSnapshot) => void) {
    super({ key: "MountainPassScene" });
    this.onHudUpdate = onHudUpdate;
  }

  create() {
    this.powerA = new MountainPowerSwitch(POWER_SWITCH_A);
    this.powerB = new MountainPowerSwitch(POWER_SWITCH_B);
    this.bridge = new BridgeRepair(BRIDGE_PANEL);
    this.bridgeBarrier = new RoadBarrier(BRIDGE_BARRIER);
    this.cacheCollectible = new HiddenCache(HIDDEN_CACHE);
    this.drawMountain();
    this.createRockfalls();
    this.vehicle = createVehicle(
      MOUNTAIN_START.x,
      MOUNTAIN_START.y,
      MOUNTAIN_START.angle,
    );
    this.car = this.createPlayerCar();
    this.createDustEmitter();
    this.cameras.main.setBounds(0, 0, MOUNTAIN_WIDTH, MOUNTAIN_HEIGHT);
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.car, true, 0.075, 0.075);
    this.setupKeyboard();
    this.emitHud();
  }

  update(_time: number, deltaMilliseconds: number) {
    const escapeDown = this.pauseKey.isDown;
    if (escapeDown && !this.pauseKeyWasDown) {
      this.setPaused(!this.paused);
    }
    this.pauseKeyWasDown = escapeDown;
    if (this.paused || this.won) return;

    if (
      this.interactionKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))
    ) {
      this.interact();
    }

    const dt = Math.min(deltaMilliseconds / 1000, 0.04);
    this.elapsed += dt;
    this.hudAccumulator += dt;
    this.respawnMessageTimer = Math.max(0, this.respawnMessageTimer - dt);
    this.respawnLockTimer = Math.max(0, this.respawnLockTimer - dt);
    this.updateNearbyState();
    this.activateReachedCheckpoints();
    this.updateRockfalls(dt);

    const previous = {
      x: this.vehicle.x,
      y: this.vehicle.y,
      angle: this.vehicle.angle,
    };
    stepVehicle(
      this.vehicle,
      this.respawnLockTimer > 0
        ? { accelerate: false, brake: false, left: false, right: false }
        : this.getControls(),
      dt,
      this.onSlipperyRoad ? 0.58 : 1,
    );

    const corners = getVehicleCorners(this.vehicle);
    for (let index = 0; index < corners.length; index += 1) {
      this.carCorners[index] = corners[index];
    }
    const offRoad = this.carCorners.some(
      (corner) => !isOnMountainRoad(corner),
    );
    const collision = getVehicleCollisionPoints(this.vehicle).some(
      (point) =>
        isMountainObstacle(point) ||
        this.bridgeBarrier.blocks(point) ||
        this.hazards.some(
          (hazard) =>
            hazard.phase === "blocked" &&
            Phaser.Math.Distance.Between(
              point.x,
              point.y,
              hazard.config.x,
              hazard.config.y,
            ) < hazard.config.impactRadius,
        ),
    );

    if (offRoad || collision) {
      if (!this.collisionActive) this.collisions += 1;
      this.collisionActive = true;
      this.vehicle.x = previous.x;
      this.vehicle.y = previous.y;
      this.vehicle.angle = previous.angle;
      this.vehicle.speed *= collision ? -0.15 : 0.12;
      this.vehicle.lateralSpeed *= -0.18;
    } else {
      this.collisionActive = false;
    }

    this.car.setPosition(this.vehicle.x, this.vehicle.y);
    this.car.setRotation(this.vehicle.angle);
    this.updateEnvironmentEffects(dt);
    this.updateNearbyState();

    if (
      this.bridge.isRepaired &&
      !this.levelCompleted &&
      Phaser.Math.Distance.Between(
        this.vehicle.x,
        this.vehicle.y,
        MOUNTAIN_EXIT.x,
        MOUNTAIN_EXIT.y,
      ) < 82
    ) {
      this.won = true;
      this.paused = true;
      this.levelCompleted = true;
      this.vehicle.speed = 0;
      this.vehicle.lateralSpeed = 0;
      playArrivalSound();
      this.tweens.add({
        targets: this.exitIndicator,
        alpha: 0.3,
        scale: 1.65,
        duration: 260,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
      });
    }

    if (this.hudAccumulator >= 0.12 || this.won) {
      this.hudAccumulator = 0;
      this.emitHud();
    }
  }

  private exitIndicator!: Phaser.GameObjects.Graphics;

  setPaused(paused: boolean) {
    if (this.won) return;
    this.paused = paused;
    this.emitHud();
  }

  interact() {
    if (this.powerA.activate(this.vehicle)) {
      playSwitchSound();
      this.switchALabel.setText("POWER ONLINE");
      this.updatePowerIndicator(this.switchAIndicator, true);
      this.updateBridgePanel();
      this.emitHud();
      return;
    }

    if (this.powerB.activate(this.vehicle)) {
      playSwitchSound();
      this.switchBLabel.setText("POWER ONLINE");
      this.updatePowerIndicator(this.switchBIndicator, true);
      this.updateBridgePanel();
      this.emitHud();
      return;
    }

    if (this.cacheCollectible.collect(this.vehicle)) {
      playSwitchSound();
      this.cacheContainer.setVisible(false);
      this.emitHud();
      return;
    }

    if (this.bridge.isNearby(this.vehicle)) {
      if (
        this.bridge.begin(
          this.vehicle,
          this.powerA.isActivated,
          this.powerB.isActivated,
        )
      ) {
        this.startBridgeRepair();
      } else {
        this.bridgeLabel.setText(
          this.powerA.isActivated || this.powerB.isActivated
            ? "RESTORE BOTH POWER STATIONS"
            : "BRIDGE LOCKED · RESTORE A + B",
        );
        this.time.delayedCall(1900, () => this.updateBridgePanel());
      }
      this.emitHud();
    }
  }

  continueLevel() {
    if (!this.won) return;
    this.won = false;
    this.paused = false;
    this.emitHud();
  }

  restart() {
    this.tweens.killTweensOf(this.bridgeDeck);
    this.tweens.killTweensOf(this.bridgeContainer);
    this.powerA.reset();
    this.powerB.reset();
    this.bridge.reset();
    this.bridgeBarrier.reset();
    this.cacheCollectible.reset();
    this.elapsed = 0;
    this.hudAccumulator = 0;
    this.collisions = 0;
    this.collisionActive = false;
    this.paused = false;
    this.won = false;
    this.levelCompleted = false;
    this.checkpointIndex = 0;
    this.respawnMessageTimer = 0;
    this.respawnLockTimer = 0;
    this.skidMarks = [];
    this.previousSkidPoints = null;
    this.dustAccumulator = 0;
    this.skidRenderAccumulator = 0;
    this.dustEmitter.killAll();
    this.skidGraphics.clear();
    this.touchControls = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
    };
    this.bridgeDeck.setRotation(-Math.PI / 2);
    this.bridgeContainer.setPosition(BRIDGE_BARRIER.x, BRIDGE_BARRIER.y);
    this.bridgeContainer.setAlpha(1);
    this.cacheContainer.setVisible(true);
    this.switchALabel.setText("E · RESTORE POWER A");
    this.switchBLabel.setText("E · RESTORE POWER B");
    this.checkpointIndicators.forEach((_, index) =>
      this.updateCheckpointIndicator(index),
    );
    this.checkpointLabels.forEach((label, index) =>
      label.setText(`CHECKPOINT ${index + 1}`),
    );
    this.updatePowerIndicator(this.switchAIndicator, false);
    this.updatePowerIndicator(this.switchBIndicator, false);
    this.hazards.forEach((hazard) => {
      this.tweens.killTweensOf(hazard.rock);
      this.tweens.killTweensOf(hazard.message);
      this.tweens.killTweensOf(hazard.warningLamp);
      hazard.phase = "ready";
      hazard.timer = 0;
      hazard.indicator.setVisible(false);
      hazard.rock.setVisible(false);
      hazard.warningLamp.setVisible(false).setAlpha(1);
    });
    this.updateBridgePanel();
    this.vehicle = createVehicle(
      MOUNTAIN_START.x,
      MOUNTAIN_START.y,
      MOUNTAIN_START.angle,
    );
    this.car.setPosition(MOUNTAIN_START.x, MOUNTAIN_START.y);
    this.car.setRotation(MOUNTAIN_START.angle);
    this.cameras.main.centerOn(MOUNTAIN_START.x, MOUNTAIN_START.y);
    this.emitHud();
  }

  setTouchControl(control: TouchControl, active: boolean) {
    this.touchControls[control] = active;
  }

  private updateNearbyState() {
    this.nearSwitchA = this.powerA.isNearby(this.vehicle);
    this.nearSwitchB = this.powerB.isNearby(this.vehicle);
    this.nearBridgePanel = this.bridge.isNearby(this.vehicle);
    this.nearCache = this.cacheCollectible.isNearby(this.vehicle);
    this.onSlipperyRoad = isOnSlipperyRoad(this.vehicle);
  }

  private activateReachedCheckpoints() {
    for (
      let index = this.checkpointIndex;
      index < CHECKPOINTS.length;
      index += 1
    ) {
      const checkpoint = CHECKPOINTS[index];
      if (
        Phaser.Math.Distance.Between(
          this.vehicle.x,
          this.vehicle.y,
          checkpoint.x,
          checkpoint.y,
        ) > checkpoint.radius * 0.62
      ) {
        continue;
      }
      this.checkpointIndex = index + 1;
      this.checkpointLabels[index].setText("CHECKPOINT SAVED");
      this.updateCheckpointIndicator(index);
      playSwitchSound();
    }
  }

  private updateRockfalls(dt: number) {
    for (const hazard of this.hazards) {
      if (
        hazard.phase === "ready" &&
        Phaser.Math.Distance.Between(
          this.vehicle.x,
          this.vehicle.y,
          hazard.config.x,
          hazard.config.y,
        ) <= hazard.config.triggerRadius
      ) {
        hazard.phase = "warning";
        hazard.timer = ROCKFALL_WARNING_SECONDS;
        hazard.indicator.setVisible(true);
        hazard.warningLamp.setVisible(true);
        this.tweens.add({
          targets: hazard.message,
          alpha: { from: 0.42, to: 1 },
          duration: 280,
          yoyo: true,
          repeat: -1,
        });
        this.tweens.add({
          targets: hazard.warningLamp,
          alpha: { from: 0.38, to: 1 },
          scale: { from: 0.82, to: 1.12 },
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        playRockfallWarningSound();
      }

      if (hazard.phase === "warning") {
        hazard.timer -= dt;
        if (hazard.timer <= 0) this.dropRock(hazard);
      } else if (hazard.phase === "blocked") {
        hazard.timer -= dt;
        if (hazard.timer <= 0) {
          hazard.phase = "spent";
          hazard.rock.setVisible(false);
          hazard.indicator.setVisible(false);
        }
      }
    }
  }

  private dropRock(hazard: Rockfall) {
    hazard.phase = "falling";
    this.tweens.killTweensOf(hazard.warningLamp);
    hazard.warningLamp.setVisible(false);
    hazard.rock.setPosition(
      hazard.config.x,
      hazard.config.y - hazard.config.impactRadius * 3,
    );
    hazard.rock.setVisible(true);
    playRockImpactSound();
    this.tweens.add({
      targets: hazard.rock,
      x: hazard.config.x,
      y: hazard.config.y,
      duration: 460,
      ease: "Bounce.easeOut",
      onComplete: () => {
        if (this.won) return;
        if (this.paused) {
          hazard.phase = "blocked";
          hazard.timer = ROCKFALL_BLOCK_SECONDS;
          return;
        }
        const hit = Phaser.Math.Distance.Between(
          this.vehicle.x,
          this.vehicle.y,
          hazard.config.x,
          hazard.config.y,
        ) < hazard.config.impactRadius + 28;
        if (hit) {
          this.respawnAtCheckpoint();
          hazard.phase = "ready";
          hazard.timer = 0;
          hazard.rock.setVisible(false);
          hazard.indicator.setVisible(false);
          return;
        }
        hazard.phase = "blocked";
        hazard.timer = ROCKFALL_BLOCK_SECONDS;
      },
    });
  }

  private respawnAtCheckpoint() {
    this.collisions += 1;
    this.collisionActive = false;
    this.respawnMessageTimer = 3;
    this.previousSkidPoints = null;
    const checkpoint =
      this.checkpointIndex === 0
        ? MOUNTAIN_START
        : CHECKPOINTS[this.checkpointIndex - 1];
    const angle = CHECKPOINT_ANGLES[this.checkpointIndex];
    this.vehicle = createVehicle(checkpoint.x, checkpoint.y, angle);
    this.car.setPosition(checkpoint.x, checkpoint.y);
    this.car.setRotation(angle);
    this.cameras.main.centerOn(checkpoint.x, checkpoint.y);
    this.respawnLockTimer = 0.85;
    this.touchControls = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
    };
    this.hazards.forEach((hazard) => {
      this.tweens.killTweensOf(hazard.rock);
      this.tweens.killTweensOf(hazard.message);
      this.tweens.killTweensOf(hazard.warningLamp);
      hazard.phase = "ready";
      hazard.timer = 0;
      hazard.indicator.setVisible(false);
      hazard.rock.setVisible(false);
      hazard.message.setAlpha(1);
      hazard.warningLamp.setVisible(false).setAlpha(1);
    });
    this.updateNearbyState();
    this.emitHud();
  }

  private startBridgeRepair() {
    playBridgeRepairSound();
    this.updateBridgePanel();
    this.tweens.add({
      targets: this.bridgeDeck,
      rotation: 0,
      duration: 1450,
      ease: "Cubic.easeInOut",
      onComplete: () => {
        if (!this.bridge.complete()) return;
        this.bridgeBarrier.open();
        this.tweens.add({
          targets: this.bridgeContainer,
          x: BRIDGE_BARRIER.x - 100,
          alpha: 0.08,
          duration: 520,
          ease: "Cubic.easeIn",
        });
        this.bridgeLabel.setText("BRIDGE REPAIRED");
        this.updateBridgePanel();
        this.emitHud();
      },
    });
  }

  private emitHud() {
    const activeHazard = this.hazards.find(
      (hazard) =>
        hazard.phase === "warning" ||
        hazard.phase === "falling" ||
        hazard.phase === "blocked",
    );
    const hazardMessage = activeHazard
      ? activeHazard.phase === "warning"
        ? `ROCKFALL IN ${Math.max(1, Math.ceil(activeHazard.timer))} · MOVE CLEAR`
        : activeHazard.phase === "falling"
          ? "ROCKFALL · IMPACT"
          : "ROCKFALL DEBRIS · PASS CAREFULLY"
      : this.respawnMessageTimer > 0
        ? "ROCKFALL IMPACT · CHECKPOINT RESPAWN"
        : "";
    const routeIndex = this.levelCompleted
      ? 5
      : Number(this.powerA.isActivated) +
        Number(this.powerB.isActivated) +
        Number(this.bridge.isRepaired);
    this.onHudUpdate({
      speed: Math.round(Math.abs(this.vehicle.speed) * 0.31),
      signedSpeed: this.vehicle.speed,
      elapsed: this.elapsed,
      x: this.vehicle.x,
      y: this.vehicle.y,
      routeIndex,
      collisions: this.collisions,
      heading: this.vehicle.angle,
      paused: this.paused,
      won: this.won,
      nearSwitch: this.nearSwitchA || this.nearSwitchB,
      puzzleActivated: this.bridge.isRepaired,
      levelCompleted: this.levelCompleted,
      switchAActivated: this.powerA.isActivated,
      switchBActivated: this.powerB.isActivated,
      bridgeRepairing: this.bridge.isRepairing,
      bridgeRepaired: this.bridge.isRepaired,
      nearSwitchA: this.nearSwitchA,
      nearSwitchB: this.nearSwitchB,
      nearBridgePanel: this.nearBridgePanel,
      canRepairBridge:
        this.nearBridgePanel &&
        this.powerA.isActivated &&
        this.powerB.isActivated &&
        !this.bridge.isRepairing &&
        !this.bridge.isRepaired,
      checkpointIndex: this.checkpointIndex,
      checkpointActivated: this.checkpointIndex > 0,
      cacheCollected: this.cacheCollectible.isCollected,
      nearCache: this.nearCache,
      bonusPoints: this.cacheCollectible.isCollected
        ? MOUNTAIN_CACHE_BONUS
        : 0,
      fallingRockWarning: Boolean(activeHazard),
      hazardMessage,
      onSlipperyRoad: this.onSlipperyRoad,
    });
  }

  private setupKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = {
      accelerate: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, true),
      ],
      brake: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, true),
      ],
      left: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, true),
      ],
      right: [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, true),
      ],
    };
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.interactionKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, true),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, true),
    ];
  }

  private getControls(): DrivingControls {
    return {
      accelerate:
        this.touchControls.accelerate ||
        this.keys.accelerate.some((key) => key.isDown),
      brake:
        this.touchControls.brake || this.keys.brake.some((key) => key.isDown),
      left:
        this.touchControls.left || this.keys.left.some((key) => key.isDown),
      right:
        this.touchControls.right || this.keys.right.some((key) => key.isDown),
    };
  }

  private drawMountain() {
    const ground = this.make.graphics({ x: 0, y: 0 }, false);
    ground.fillStyle(0x485448, 1);
    ground.fillRect(0, 0, MOUNTAIN_WIDTH, MOUNTAIN_HEIGHT);

    this.drawElevation(ground);
    this.drawGorge(ground);
    this.drawForest(ground);
    this.drawRoads(ground);
    this.drawGuardrails(ground);
    this.drawLandslide(ground);
    this.drawBridgeGap(ground);
    this.drawInfrastructure(ground);

    ground.generateTexture(
      "escape-route-mountain-pass",
      MOUNTAIN_WIDTH,
      MOUNTAIN_HEIGHT,
    );
    ground.destroy();
    this.add
      .image(MOUNTAIN_WIDTH / 2, MOUNTAIN_HEIGHT / 2, "escape-route-mountain-pass")
      .setDepth(0);
    this.drawSwayingTrees();
    this.createWaterGlints();
    this.skidGraphics = this.add.graphics().setDepth(2);
    this.drawMarkers();
  }

  private drawElevation(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x344339, 0.78);
    graphics.fillPoints(
      [
        { x: 0, y: 0 },
        { x: 1300, y: 0 },
        { x: 1100, y: 480 },
        { x: 620, y: 600 },
        { x: 0, y: 420 },
      ],
      true,
    );
    graphics.fillStyle(0x776b50, 0.2);
    graphics.fillPoints(
      [
        { x: 1450, y: 0 },
        { x: 2800, y: 0 },
        { x: 2800, y: 760 },
        { x: 2500, y: 1010 },
        { x: 2260, y: 820 },
        { x: 2050, y: 300 },
      ],
      true,
    );
    graphics.fillStyle(0x9b8c68, 0.08);
    for (let index = 0; index < 17; index += 1) {
      graphics.lineStyle(2, 0xd3c18f, 0.08);
      graphics.strokeEllipse(
        380 + index * 30,
        520 + index * 9,
        950 + index * 18,
        350 + index * 11,
      );
    }

    const ridge = [
      { x: 40, y: 1280 },
      { x: 360, y: 1140 },
      { x: 700, y: 1200 },
      { x: 860, y: 1380 },
      { x: 680, y: 1570 },
      { x: 310, y: 1510 },
      { x: 0, y: 1660 },
    ];
    graphics.fillStyle(0x27342d, 0.34);
    graphics.fillPoints(ridge, true);
    graphics.lineStyle(3, 0xb9a777, 0.12);
    graphics.strokePoints(ridge, true);
  }

  private drawGorge(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x172320, 0.75);
    graphics.fillPoints(
      [
        { x: 1850, y: 690 },
        { x: 2160, y: 735 },
        { x: 2320, y: 900 },
        { x: 2270, y: 1170 },
        { x: 2330, y: 1410 },
        { x: 2130, y: 1540 },
        { x: 1860, y: 1430 },
        { x: 1920, y: 1210 },
        { x: 1840, y: 1050 },
      ],
      true,
    );
    graphics.fillStyle(0x5d5948, 0.86);
    graphics.fillPoints(
      [
        { x: 1880, y: 720 },
        { x: 1960, y: 790 },
        { x: 1960, y: 1370 },
        { x: 1870, y: 1415 },
        { x: 1918, y: 1205 },
        { x: 1840, y: 1050 },
      ],
      true,
    );
    graphics.fillStyle(0x675e48, 0.76);
    graphics.fillPoints(
      [
        { x: 2220, y: 770 },
        { x: 2320, y: 900 },
        { x: 2270, y: 1170 },
        { x: 2330, y: 1410 },
        { x: 2210, y: 1490 },
        { x: 2260, y: 1170 },
      ],
      true,
    );

    const river = [
      { x: 2030, y: 790 },
      { x: 2070, y: 930 },
      { x: 2010, y: 1070 },
      { x: 2105, y: 1220 },
      { x: 2050, y: 1390 },
    ];
    graphics.lineStyle(92, 0x1e3338, 1);
    graphics.beginPath();
    graphics.moveTo(river[0].x, river[0].y);
    river.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
    graphics.lineStyle(48, 0x315a61, 0.96);
    graphics.beginPath();
    graphics.moveTo(river[0].x, river[0].y);
    river.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
    graphics.lineStyle(5, 0x8db0a1, 0.44);
    graphics.beginPath();
    graphics.moveTo(river[0].x - 12, river[0].y);
    river.slice(1).forEach((point) =>
      graphics.lineTo(point.x - 12, point.y),
    );
    graphics.strokePath();
    graphics.lineStyle(4, 0x151f1d, 0.65);
    graphics.strokePoints(
      [
        { x: 1930, y: 800 },
        { x: 1985, y: 930 },
        { x: 1940, y: 1070 },
        { x: 2020, y: 1220 },
        { x: 1975, y: 1390 },
      ],
      false,
    );
  }

  private drawForest(graphics: Phaser.GameObjects.Graphics) {
    const trees = getForestTrees();
    const swayingTreeIndices = new Set<number>();
    this.swayingTrees = [];
    trees.forEach((tree, index) => {
      if (index % 43 !== 0) return;
      swayingTreeIndices.add(index);
      this.swayingTrees.push(tree);
    });
    trees.forEach((tree, index) => {
      if (swayingTreeIndices.has(index)) return;
      const size = 14 + (index % 5) * 2.5;
      graphics.fillStyle(0x111a17, 0.25);
      graphics.fillEllipse(tree.x + 7, tree.y + 13, size * 2, size * 0.75);
      graphics.fillStyle(index % 2 ? 0x334638 : 0x3d513e, 0.94);
      graphics.fillTriangle(
        tree.x,
        tree.y - size,
        tree.x - size * 0.8,
        tree.y + size * 0.7,
        tree.x + size * 0.8,
        tree.y + size * 0.7,
      );
      graphics.fillStyle(index % 2 ? 0x496047 : 0x52654b, 0.88);
      graphics.fillTriangle(
        tree.x,
        tree.y - size * 0.45,
        tree.x - size * 0.68,
        tree.y + size,
        tree.x + size * 0.68,
        tree.y + size,
      );
      graphics.fillStyle(0x74664f, 0.9);
      graphics.fillRect(tree.x - 2, tree.y + size * 0.5, 4, 8);
    });

    graphics.fillStyle(0x8b8064, 0.45);
    for (let index = 0; index < 150; index += 1) {
      const x = ((index * 173) % MOUNTAIN_WIDTH) + 10;
      const y = ((index * 227) % MOUNTAIN_HEIGHT) + 10;
      if (!MOUNTAIN_ROADS.some((segment) => this.distanceToRoad(x, y, segment) < 70)) {
        const size = 3 + (index % 5) * 1.4;
        graphics.fillEllipse(x, y, size * 1.8, size);
      }
    }
  }

  private drawRoads(graphics: Phaser.GameObjects.Graphics) {
    MOUNTAIN_ROAD_CENTRELINES.forEach((road, index) => {
      const path = buildMountainRoadPath(road.points, road.width);
      this.fillRoadCorridor(graphics, path, road.width + 20, 0x252b28, 0.48);
      this.fillRoadCorridor(graphics, path, road.width + 12, 0x625e51, 0.82);
      this.fillRoadCorridor(graphics, path, road.width, 0x3d4441, 1);
      this.fillRoadCorridor(graphics, path, road.width - 9, 0x464c48, 0.56);
      this.drawRoadTexture(graphics, path, road.width, index);

      const edgeOffset = road.width * 0.5 - 5;
      this.strokePolyline(
        graphics,
        offsetPolyline(path, edgeOffset),
        1.5,
        0xb5b7a9,
        0.32,
      );
      this.strokePolyline(
        graphics,
        offsetPolyline(path, -edgeOffset),
        1.5,
        0xb5b7a9,
        0.32,
      );

      const pathLength = getPolylineLength(path);
      if (road.width >= 84 && pathLength > 220) {
        graphics.lineStyle(2, 0xc7b67e, 0.58);
        for (let distance = 24; distance < pathLength - 18; distance += 72) {
          const dashStart = pointAtPolylineDistance(path, distance);
          const dashEnd = pointAtPolylineDistance(
            path,
            Math.min(distance + 22, pathLength - 18),
          );
          graphics.lineBetween(
            dashStart.x,
            dashStart.y,
            dashEnd.x,
            dashEnd.y,
          );
        }
      }
    });

    SLIPPERY_ROADS.forEach((road) => {
      graphics.lineStyle(road.width - 20, 0x9ca99e, 0.14);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.lineStyle(2, 0xc4d1c5, 0.28);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
    });

    ROCKFALL_ZONES.forEach((zone) => {
      graphics.fillStyle(0x9b7655, 0.3);
      graphics.fillCircle(zone.x, zone.y, 52);
      graphics.fillStyle(0x6a5944, 0.78);
      graphics.fillTriangle(
        zone.x - 42,
        zone.y + 11,
        zone.x - 6,
        zone.y - 36,
        zone.x + 32,
        zone.y + 22,
      );
    });
  }

  private fillRoadCorridor(
    graphics: Phaser.GameObjects.Graphics,
    path: Point[],
    width: number,
    color: number,
    alpha: number,
  ) {
    const left = offsetPolyline(path, width / 2);
    const right = offsetPolyline(path, -width / 2).reverse();
    graphics.fillStyle(color, alpha);
    graphics.fillPoints([...left, ...right], true);
  }

  private strokePolyline(
    graphics: Phaser.GameObjects.Graphics,
    points: Point[],
    width: number,
    color: number,
    alpha: number,
  ) {
    if (points.length < 2) return;
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
  }

  private drawRoadTexture(
    graphics: Phaser.GameObjects.Graphics,
    path: Point[],
    width: number,
    roadIndex: number,
  ) {
    const totalLength = getPolylineLength(path);
    for (let distance = 12, mark = 0; distance < totalLength - 8; distance += 31, mark += 1) {
      const center = pointAtPolylineDistance(path, distance);
      const before = pointAtPolylineDistance(path, Math.max(0, distance - 2));
      const after = pointAtPolylineDistance(
        path,
        Math.min(totalLength, distance + 2),
      );
      const tangentLength = Math.hypot(after.x - before.x, after.y - before.y) || 1;
      const normalX = -(after.y - before.y) / tangentLength;
      const normalY = (after.x - before.x) / tangentLength;
      const noise = Math.sin((mark + 1) * 12.9898 + roadIndex * 78.233) * 43758.5453;
      const random = noise - Math.floor(noise);
      const offset = (random - 0.5) * Math.max(0, width - 18);
      const radius = 0.8 + random * 1.4;
      graphics.fillStyle(mark % 2 ? 0x858a82 : 0x232927, 0.13);
      graphics.fillEllipse(
        center.x + normalX * offset,
        center.y + normalY * offset,
        radius * 2.2,
        radius,
      );

      if (mark % 19 === 8) {
        const crackX = center.x + normalX * offset;
        const crackY = center.y + normalY * offset;
        graphics.lineStyle(1.2, 0x1f2422, 0.34);
        graphics.beginPath();
        graphics.moveTo(crackX - normalX * 5, crackY - normalY * 5);
        graphics.lineTo(crackX, crackY);
        graphics.lineTo(crackX + normalY * 4, crackY - normalX * 4);
        graphics.lineTo(crackX + normalX * 7, crackY + normalY * 7);
        graphics.strokePath();
      }
    }
  }

  private drawSwayingTrees() {
    this.swayingTrees.forEach((tree, index) => {
      const size = 14 + (index % 5) * 2.5;
      const canopy = this.add
        .container(tree.x, tree.y + size)
        .setDepth(1);
      const graphics = this.add.graphics();
      graphics.fillStyle(0x111a17, 0.2);
      graphics.fillEllipse(7, 9, size * 2, size * 0.75);
      graphics.fillStyle(index % 2 ? 0x334638 : 0x3d513e, 0.94);
      graphics.fillTriangle(
        0,
        -size * 2,
        -size * 0.8,
        -size * 0.3,
        size * 0.8,
        -size * 0.3,
      );
      graphics.fillStyle(index % 2 ? 0x496047 : 0x52654b, 0.88);
      graphics.fillTriangle(
        0,
        -size * 1.45,
        -size * 0.68,
        0,
        size * 0.68,
        0,
      );
      graphics.fillStyle(0x74664f, 0.9);
      graphics.fillRect(-2, -3, 4, 8);
      canopy.add(graphics);
      this.tweens.add({
        targets: canopy,
        angle: { from: -1.4, to: 1.4 },
        duration: 2300 + (index % 4) * 360,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: index * 75,
      });
    });
  }

  private createWaterGlints() {
    for (let index = 0; index < 12; index += 1) {
      const segmentIndex = Math.floor(index / 3);
      const segment = RIVER_CENTERLINE[segmentIndex];
      const next = RIVER_CENTERLINE[segmentIndex + 1];
      const progress = (index % 3) / 3;
      const glint = this.add.graphics().setDepth(1);
      glint.lineStyle(2, 0xa2c3b1, 0.42);
      glint.lineBetween(-6, -2, 6, -2);
      glint.lineStyle(1, 0x9ab8a7, 0.34);
      glint.lineBetween(-3, 3, 4, 3);
      glint.setPosition(
        Phaser.Math.Linear(segment.x, next.x, progress),
        Phaser.Math.Linear(segment.y, next.y, progress),
      );
      this.waterGlints.push(glint);
      this.flowWaterGlint(glint, segmentIndex);
    }
  }

  private flowWaterGlint(
    glint: Phaser.GameObjects.Graphics,
    segmentIndex: number,
  ) {
    if (!glint.active) return;
    const from = RIVER_CENTERLINE[segmentIndex];
    const to = RIVER_CENTERLINE[segmentIndex + 1];
    const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    this.tweens.add({
      targets: glint,
      x: to.x,
      y: to.y,
      duration: length * 24,
      ease: "Linear",
      onComplete: () => {
        if (!glint.active) return;
        const nextSegment = (segmentIndex + 1) % (RIVER_CENTERLINE.length - 1);
        const nextStart = RIVER_CENTERLINE[nextSegment];
        glint.setPosition(nextStart.x, nextStart.y);
        this.flowWaterGlint(glint, nextSegment);
      },
    });
  }

  private createDustEmitter() {
    const textureKey = "escape-route-mountain-dust";
    if (!this.textures.exists(textureKey)) {
      const texture = this.make.graphics({ x: 0, y: 0 }, false);
      texture.fillStyle(0xc5b99c, 0.65);
      texture.fillCircle(5, 5, 4);
      texture.generateTexture(textureKey, 10, 10);
      texture.destroy();
    }
    this.dustEmitter = this.add
      .particles(0, 0, textureKey, {
        angle: { min: 0, max: 360 },
        alpha: { start: 0.3, end: 0 },
        emitting: false,
        frequency: -1,
        lifespan: { min: 260, max: 460 },
        maxParticles: 42,
        quantity: 1,
        scale: { start: 0.5, end: 1.4 },
        speed: { min: 5, max: 17 },
      })
      .setDepth(6);
  }

  private updateEnvironmentEffects(dt: number) {
    const forwardX = Math.cos(this.vehicle.angle);
    const forwardY = Math.sin(this.vehicle.angle);
    const sideX = -forwardY;
    const sideY = forwardX;
    const rearX = this.vehicle.x - forwardX * VEHICLE_LENGTH * 0.36;
    const rearY = this.vehicle.y - forwardY * VEHICLE_LENGTH * 0.36;
    const skidding =
      Math.abs(this.vehicle.speed) > 85 &&
      Math.abs(this.vehicle.lateralSpeed) > 19;

    if (skidding) {
      const current: [Point, Point] = [
        {
          x: rearX + sideX * VEHICLE_WIDTH * 0.36,
          y: rearY + sideY * VEHICLE_WIDTH * 0.36,
        },
        {
          x: rearX - sideX * VEHICLE_WIDTH * 0.36,
          y: rearY - sideY * VEHICLE_WIDTH * 0.36,
        },
      ];
      if (this.previousSkidPoints) {
        current.forEach((point, index) => {
          const previous = this.previousSkidPoints?.[index];
          if (!previous || Phaser.Math.Distance.Between(
            previous.x,
            previous.y,
            point.x,
            point.y,
          ) < 1.5) {
            return;
          }
          this.skidMarks.push({
            from: previous,
            to: point,
            life: 2.4,
          });
        });
      }
      this.previousSkidPoints = current;
    } else {
      this.previousSkidPoints = null;
    }

    this.dustAccumulator -= dt;
    if (this.dustAccumulator <= 0) {
      this.dustAccumulator = 0.085;
      if (Math.abs(this.vehicle.speed) > 75 && this.isOnGravelShoulder()) {
        this.dustEmitter.emitParticleAt(rearX, rearY, 1);
      }
    }

    this.skidMarks = this.skidMarks
      .map((mark) => ({ ...mark, life: mark.life - dt }))
      .filter((mark) => mark.life > 0)
      .slice(-120);
    this.skidRenderAccumulator -= dt;
    if (this.skidRenderAccumulator > 0) return;
    this.skidRenderAccumulator = 0.1;
    this.skidGraphics.clear();
    this.skidMarks.forEach((mark) => {
      this.skidGraphics.lineStyle(
        2.4,
        0x202321,
        Math.min(mark.life / 2.4, 0.34),
      );
      this.skidGraphics.lineBetween(
        mark.from.x,
        mark.from.y,
        mark.to.x,
        mark.to.y,
      );
    });
  }

  private isOnGravelShoulder() {
    return MOUNTAIN_ROADS.some((road) => {
      const distance = this.distanceToRoad(
        this.vehicle.x,
        this.vehicle.y,
        road,
      );
      return (
        distance > road.width / 2 - 4 &&
        distance <= road.width / 2 + 8
      );
    });
  }

  private distanceToRoad(
    x: number,
    y: number,
    segment: (typeof MOUNTAIN_ROADS)[number],
  ) {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection =
      ((x - segment.from.x) * dx + (y - segment.from.y) * dy) /
      lengthSquared;
    const t = Phaser.Math.Clamp(projection, 0, 1);
    return Math.hypot(
      x - (segment.from.x + t * dx),
      y - (segment.from.y + t * dy),
    );
  }

  private drawLandslide(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x272b27, 0.32);
    graphics.fillEllipse(1440, 1227, 235, 206);
    LANDSLIDE_ROCKS.forEach((rock, index) => {
      graphics.fillStyle(0x373a35, 0.9);
      graphics.fillPoints(
        getRockVertices(rock.x + 7, rock.y + 11, rock.radius + 3, index + 2),
        true,
      );
      graphics.fillStyle(index % 2 ? 0x777263 : 0x68675d, 1);
      graphics.fillPoints(getRockVertices(rock.x, rock.y, rock.radius, index), true);
      graphics.fillStyle(0xaaa18a, 0.52);
      graphics.fillTriangle(
        rock.x - rock.radius * 0.68,
        rock.y - rock.radius * 0.22,
        rock.x - rock.radius * 0.16,
        rock.y - rock.radius * 0.78,
        rock.x + rock.radius * 0.12,
        rock.y - rock.radius * 0.14,
      );
      graphics.lineStyle(3, 0x403f38, 0.75);
      graphics.lineBetween(rock.x - 20, rock.y + 3, rock.x + 10, rock.y - 15);
    });
    graphics.fillStyle(0xa34f39, 1);
    graphics.fillTriangle(1528, 1140, 1548, 1178, 1508, 1178);
    graphics.fillStyle(0xf0dfbb, 1);
    graphics.fillRect(1525, 1153, 6, 13);
    graphics.fillCircle(1528, 1172, 2.8);
  }

  private drawGuardrails(graphics: Phaser.GameObjects.Graphics) {
    DAMAGED_GUARDRAILS.forEach((section) => {
      const { points } = section;
      graphics.lineStyle(8, 0x282e2b, 0.9);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
      graphics.strokePath();
      graphics.lineStyle(3, 0x9c967e, 0.82);
      if (section.damaged) {
        const start = points[0];
        const end = points[points.length - 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        graphics.lineBetween(
          start.x,
          start.y,
          start.x + dx * 0.38,
          start.y + dy * 0.38,
        );
        graphics.lineBetween(
          start.x + dx * 0.62,
          start.y + dy * 0.62,
          end.x,
          end.y,
        );
      } else {
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) =>
          graphics.lineTo(point.x, point.y),
        );
        graphics.strokePath();
      }
      points.forEach((point, index) => {
        if (section.damaged && index === Math.floor(points.length / 2)) return;
        graphics.fillStyle(0x282e2b, 1);
        graphics.fillRect(point.x - 3, point.y - 5, 6, 12);
      });
    });
  }

  private drawBridgeGap(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x172320, 1);
    graphics.fillRoundedRect(
      BRIDGE_SPAN.x - BRIDGE_SPAN.width / 2 - 8,
      BRIDGE_SPAN.y - BRIDGE_SPAN.height / 2 - 10,
      BRIDGE_SPAN.width + 16,
      BRIDGE_SPAN.height + 20,
      12,
    );
    graphics.lineStyle(6, 0x655d48, 0.9);
    graphics.lineBetween(
      BRIDGE_SPAN.x - BRIDGE_SPAN.width / 2,
      BRIDGE_SPAN.y - BRIDGE_SPAN.height / 2 - 12,
      BRIDGE_SPAN.x - BRIDGE_SPAN.width / 2,
      BRIDGE_SPAN.y + BRIDGE_SPAN.height / 2 + 12,
    );
    graphics.lineBetween(
      BRIDGE_SPAN.x + BRIDGE_SPAN.width / 2,
      BRIDGE_SPAN.y - BRIDGE_SPAN.height / 2 - 12,
      BRIDGE_SPAN.x + BRIDGE_SPAN.width / 2,
      BRIDGE_SPAN.y + BRIDGE_SPAN.height / 2 + 12,
    );
    graphics.fillStyle(0x9a8b68, 0.82);
    for (let index = 0; index < 7; index += 1) {
      const x = BRIDGE_SPAN.x - BRIDGE_SPAN.width / 2 + index * 42;
      graphics.fillCircle(x, BRIDGE_SPAN.y - 54, 4);
      graphics.fillCircle(x, BRIDGE_SPAN.y + 54, 4);
    }
  }

  private drawInfrastructure(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x222a26, 0.52);
    graphics.fillRoundedRect(897, 650, 228, 86, 8);
    graphics.fillStyle(0x65665c, 1);
    graphics.fillRoundedRect(890, 642, 228, 86, 8);
    graphics.fillStyle(0x464c46, 1);
    graphics.fillRoundedRect(900, 651, 208, 68, 6);
    graphics.fillStyle(0xb9ab8a, 0.6);
    graphics.fillRect(916, 660, 18, 45);
    graphics.fillStyle(0x9a4f3d, 0.9);
    graphics.fillRect(920, 668, 10, 8);
    graphics.fillStyle(0x202624, 0.9);
    graphics.fillRoundedRect(949, 661, 68, 44, 4);
    graphics.lineStyle(2, 0xd1bb85, 0.58);
    graphics.strokeRoundedRect(949, 661, 68, 44, 4);
    graphics.fillStyle(0x57594e, 1);
    graphics.fillRoundedRect(1552, 521, 70, 38, 5);
    graphics.lineStyle(3, 0x71694f, 0.8);
    graphics.lineBetween(1587, 520, 1587, 485);
    graphics.lineBetween(1568, 485, 1606, 485);
    graphics.lineStyle(2, 0x403c31, 0.75);
    graphics.lineBetween(1574, 485, 1574, 460);
    graphics.lineBetween(1600, 485, 1600, 460);
  }

  private drawMarkers() {
    const start = this.add.container(MOUNTAIN_START.x, MOUNTAIN_START.y).setDepth(4);
    const startGraphic = this.add.graphics();
    startGraphic.fillStyle(0xe4bd76, 0.18);
    startGraphic.fillCircle(0, 0, 56);
    startGraphic.lineStyle(3, 0xe7bd70, 0.9);
    startGraphic.strokeCircle(0, 0, 34);
    startGraphic.fillStyle(0xe7bd70, 1);
    startGraphic.fillCircle(0, 0, 6);
    start.add(startGraphic);
    this.tweens.add({
      targets: start,
      scale: { from: 0.9, to: 1.1 },
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.addMarkerLabel(MOUNTAIN_START.x, MOUNTAIN_START.y + 65, "MOUNTAIN ENTRANCE");

    const exit = this.add.container(MOUNTAIN_EXIT.x, MOUNTAIN_EXIT.y).setDepth(4);
    const exitGraphic = this.add.graphics();
    exitGraphic.fillStyle(0xd7a873, 0.2);
    exitGraphic.fillCircle(0, 0, 67);
    exitGraphic.lineStyle(3, 0xd7a873, 0.9);
    exitGraphic.strokeCircle(0, 0, 42);
    this.exitIndicator = this.add.graphics();
    exit.add([exitGraphic, this.exitIndicator]);
    this.exitIndicator.fillStyle(0xd7a873, 1);
    this.exitIndicator.fillCircle(0, 0, 8);
    this.tweens.add({
      targets: exit,
      scale: { from: 0.88, to: 1.12 },
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.addMarkerLabel(MOUNTAIN_EXIT.x, MOUNTAIN_EXIT.y - 70, "SUMMIT RELAY · EXIT");

    this.checkpointIndicators = [];
    this.checkpointLabels = [];
    CHECKPOINTS.forEach((checkpoint, index) => {
      const marker = this.add.graphics().setDepth(4);
      marker.fillStyle(0x232b27, 0.28);
      marker.fillCircle(checkpoint.x, checkpoint.y, 34);
      marker.lineStyle(3, 0xb2c08f, 0.88);
      marker.strokeCircle(checkpoint.x, checkpoint.y, 26);
      marker.fillStyle(0xb2c08f, 1);
      marker.fillCircle(checkpoint.x, checkpoint.y, 8);
      this.checkpointIndicators.push(marker);
      this.checkpointLabels.push(
        this.add
          .text(
            checkpoint.x,
            checkpoint.y + 41,
            `CHECKPOINT ${index + 1}`,
            this.markerTextStyle("#d1d9b4", 9),
          )
          .setOrigin(0.5)
          .setDepth(5),
      );
    });
    this.drawSwitch(POWER_SWITCH_A, "POWER STATION A", true);
    this.drawSwitch(POWER_SWITCH_B, "POWER STATION B", false);
    this.drawBridge();
    this.drawCache();
    this.add
      .text(1190, 1272, "LANDSLIDE · PASS CLOSED", this.markerTextStyle("#edc197", 10))
      .setOrigin(0.5)
      .setDepth(5);
    this.drawRoadSigns();
  }

  private drawSwitch(
    marker: typeof POWER_SWITCH_A,
    title: string,
    isPowerA: boolean,
  ) {
    const base = this.add.container(marker.x, marker.y).setDepth(4);
    const graphic = this.add.graphics();
    graphic.fillStyle(0x262d29, 0.82);
    graphic.fillRoundedRect(-32, -28, 64, 56, 8);
    graphic.lineStyle(2, 0xc5ad7b, 0.76);
    graphic.strokeRoundedRect(-32, -28, 64, 56, 8);
    graphic.fillStyle(0x424a40, 1);
    graphic.fillRoundedRect(-22, -19, 44, 38, 5);
    graphic.fillStyle(0x1f2825, 1);
    graphic.fillRoundedRect(-14, -12, 28, 25, 4);
    const indicator = this.add.graphics();
    base.add([graphic, indicator]);
    if (isPowerA) this.switchAIndicator = indicator;
    else this.switchBIndicator = indicator;
    this.updatePowerIndicator(indicator, false);
    this.tweens.add({
      targets: indicator,
      alpha: { from: 0.55, to: 1 },
      duration: 920,
      yoyo: true,
      repeat: -1,
    });
    this.addMarkerLabel(marker.x, marker.y - 52, title);
    const label = this.add
      .text(
        marker.x,
        marker.y + 44,
        isPowerA ? "E · RESTORE POWER A" : "E · RESTORE POWER B",
        this.markerTextStyle("#e1d4b8", 8),
      )
      .setOrigin(0.5)
      .setDepth(5);
    if (isPowerA) this.switchALabel = label;
    else this.switchBLabel = label;
  }

  private drawBridge() {
    this.bridgeDeck = this.add.container(BRIDGE_SPAN.x, BRIDGE_SPAN.y)
      .setDepth(3)
      .setRotation(-Math.PI / 2);
    const deck = this.add.graphics();
    deck.fillStyle(0x292d2a, 1);
    deck.fillRoundedRect(
      -BRIDGE_SPAN.width / 2,
      -BRIDGE_SPAN.height / 2,
      BRIDGE_SPAN.width,
      BRIDGE_SPAN.height,
      5,
    );
    deck.fillStyle(0x615b49, 1);
    deck.fillRoundedRect(
      -BRIDGE_SPAN.width / 2 + 8,
      -BRIDGE_SPAN.height / 2 + 8,
      BRIDGE_SPAN.width - 16,
      BRIDGE_SPAN.height - 16,
      3,
    );
    for (let x = -BRIDGE_SPAN.width / 2 + 15; x < BRIDGE_SPAN.width / 2; x += 22) {
      deck.lineStyle(2, 0x928467, 0.84);
      deck.lineBetween(
        x,
        -BRIDGE_SPAN.height / 2 + 10,
        x,
        BRIDGE_SPAN.height / 2 - 10,
      );
    }
    deck.lineStyle(5, 0xb5a47f, 0.86);
    deck.lineBetween(
      -BRIDGE_SPAN.width / 2 + 3,
      -BRIDGE_SPAN.height / 2 + 7,
      BRIDGE_SPAN.width / 2 - 3,
      -BRIDGE_SPAN.height / 2 + 7,
    );
    deck.lineBetween(
      -BRIDGE_SPAN.width / 2 + 3,
      BRIDGE_SPAN.height / 2 - 7,
      BRIDGE_SPAN.width / 2 - 3,
      BRIDGE_SPAN.height / 2 - 7,
    );
    this.bridgeDeck.add(deck);

    this.bridgeContainer = this.add
      .container(BRIDGE_BARRIER.x, BRIDGE_BARRIER.y)
      .setDepth(5);
    const gate = this.add.graphics();
    gate.fillStyle(0x181e1c, 0.95);
    gate.fillRoundedRect(-10, -BRIDGE_BARRIER.height / 2, 20, BRIDGE_BARRIER.height, 5);
    for (let y = -BRIDGE_BARRIER.height / 2 + 7; y < BRIDGE_BARRIER.height / 2 - 6; y += 24) {
      gate.fillStyle(Math.floor((y + BRIDGE_BARRIER.height) / 24) % 2 ? 0xe1d0aa : 0xb65740, 1);
      gate.fillRect(-8, y, 16, 14);
    }
    this.bridgeContainer.add(gate);
    this.bridgeLabel = this.add
      .text(
        BRIDGE_BARRIER.x,
        BRIDGE_BARRIER.y - BRIDGE_BARRIER.height / 2 - 26,
        "BRIDGE OUT · POWER A + B",
        this.markerTextStyle("#e6d9bb", 9),
      )
      .setOrigin(0.5)
      .setDepth(6);

    const panel = this.add.container(BRIDGE_PANEL.x, BRIDGE_PANEL.y).setDepth(4);
    const casing = this.add.graphics();
    casing.fillStyle(0x323834, 1);
    casing.fillRoundedRect(-26, -23, 52, 46, 5);
    casing.lineStyle(2, 0xc8b88b, 0.7);
    casing.strokeRoundedRect(-26, -23, 52, 46, 5);
    casing.fillStyle(0x222a26, 1);
    casing.fillRoundedRect(-18, -15, 36, 30, 3);
    this.bridgePanelIndicator = this.add.graphics();
    panel.add([casing, this.bridgePanelIndicator]);
    this.updateBridgePanel();
    this.addMarkerLabel(BRIDGE_PANEL.x, BRIDGE_PANEL.y - 44, "BRIDGE CONTROL");
  }

  private drawCache() {
    this.cacheContainer = this.add.container(HIDDEN_CACHE.x, HIDDEN_CACHE.y).setDepth(4);
    const cache = this.add.graphics();
    cache.fillStyle(0x242a24, 0.88);
    cache.fillRoundedRect(-19, -12, 38, 25, 7);
    cache.lineStyle(2, 0xd6c17c, 0.68);
    cache.strokeRoundedRect(-19, -12, 38, 25, 7);
    cache.fillStyle(0x9e8653, 0.9);
    cache.fillRect(-15, -3, 30, 6);
    cache.fillStyle(0xe7d59b, 0.9);
    cache.fillCircle(0, 0, 4);
    this.cacheContainer.add(cache);
    this.tweens.add({
      targets: this.cacheContainer,
      alpha: { from: 0.38, to: 0.9 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });
  }

  private createRockfalls() {
    this.hazards = ROCKFALL_ZONES.map((config, index): Rockfall => {
      const indicator = this.add.container(config.x, config.y).setDepth(4);
      const ring = this.add.graphics();
      ring.fillStyle(0xb3513b, 0.14);
      ring.fillCircle(0, 0, config.impactRadius + 18);
      ring.lineStyle(3, 0xd17a54, 0.9);
      ring.strokeCircle(0, 0, config.impactRadius + 18);
      ring.lineStyle(2, 0xe5b675, 0.8);
      ring.strokeCircle(0, 0, config.impactRadius + 31);
      const message = this.add
        .text(0, -config.impactRadius - 43, "ROCKFALL · MOVE CLEAR", {
          ...this.markerTextStyle("#ffe0ae", 10),
          backgroundColor: "#4a251e",
          padding: { x: 7, y: 5 },
        })
        .setOrigin(0.5);
      indicator.add([ring, message]);
      indicator.setVisible(false);

      const rock = this.add.container(config.x, config.y).setDepth(5);
      const boulder = this.add.graphics();
      boulder.fillStyle(0x242824, 0.5);
      boulder.fillEllipse(-5, 16, config.impactRadius * 2.6, config.impactRadius);
      boulder.fillStyle(index % 2 ? 0x777467 : 0x67665c, 1);
      boulder.fillPoints(
        getRockVertices(0, 0, config.impactRadius, index + 4),
        true,
      );
      boulder.fillStyle(0xb5aa8f, 0.52);
      boulder.fillTriangle(
        -config.impactRadius * 0.78,
        -config.impactRadius * 0.2,
        -config.impactRadius * 0.22,
        -config.impactRadius * 0.72,
        config.impactRadius * 0.16,
        -config.impactRadius * 0.1,
      );
      rock.add(boulder);
      rock.setVisible(false);
      const warningLamp = this.add
        .container(config.x + 68, config.y - 62)
        .setDepth(5);
      const lamp = this.add.graphics();
      lamp.fillStyle(0x282e2b, 0.9);
      lamp.fillRect(-2, 4, 4, 18);
      lamp.fillStyle(0x342c24, 1);
      lamp.fillCircle(0, 0, 10);
      lamp.fillStyle(0xe4a451, 0.3);
      lamp.fillCircle(0, 0, 9);
      lamp.fillStyle(0xf4c26d, 1);
      lamp.fillCircle(0, 0, 4);
      warningLamp.add(lamp);
      warningLamp.setVisible(false);
      return {
        config,
        phase: "ready",
        timer: 0,
        indicator,
        ring,
        message,
        rock,
        warningLamp,
      };
    });
  }

  private drawRoadSigns() {
    const signs = [
      { x: 1160, y: 1510, title: "SERVICE ROAD" },
      { x: 1690, y: 1040, title: "BRIDGE OUT" },
      { x: 2340, y: 920, title: "SUMMIT · 1.4 KM" },
    ];
    signs.forEach((sign) => {
      const signGraphic = this.add.graphics().setDepth(4);
      signGraphic.fillStyle(0x302f29, 1);
      signGraphic.fillRect(sign.x - 2, sign.y, 4, 24);
      signGraphic.fillStyle(0x36443c, 1);
      signGraphic.fillRoundedRect(sign.x - 45, sign.y - 27, 90, 28, 3);
      signGraphic.lineStyle(2, 0xb7a77e, 0.82);
      signGraphic.strokeRoundedRect(sign.x - 45, sign.y - 27, 90, 28, 3);
      this.add
        .text(sign.x, sign.y - 13, sign.title, this.markerTextStyle("#e1d1ab", 8))
        .setOrigin(0.5)
        .setDepth(5);
    });
  }

  private updatePowerIndicator(graphics: Phaser.GameObjects.Graphics, active: boolean) {
    graphics.clear();
    graphics.fillStyle(active ? 0x9eb78b : 0xd2a65e, 1);
    graphics.fillCircle(0, 0, 6);
    graphics.fillStyle(active ? 0xaec99a : 0xe9bf72, 0.22);
    graphics.fillCircle(0, 0, 16);
  }

  private updateCheckpointIndicator(index: number) {
    const checkpoint = CHECKPOINTS[index];
    const activated = index < this.checkpointIndex;
    const graphics = this.checkpointIndicators[index];
    graphics.clear();
    graphics.fillStyle(0x232b27, 0.28);
    graphics.fillCircle(checkpoint.x, checkpoint.y, 34);
    graphics.lineStyle(3, activated ? 0xa8c58f : 0xb2c08f, 0.88);
    graphics.strokeCircle(checkpoint.x, checkpoint.y, activated ? 30 : 26);
    graphics.fillStyle(activated ? 0xa8c58f : 0xb2c08f, 1);
    graphics.fillCircle(checkpoint.x, checkpoint.y, 8);
  }

  private updateBridgePanel() {
    this.bridgePanelIndicator?.clear();
    const ready = this.powerA.isActivated && this.powerB.isActivated;
    this.bridgePanelIndicator?.fillStyle(
      this.bridge.isRepaired ? 0x9eb78b : ready ? 0xd2a65e : 0xa44f3d,
      1,
    );
    this.bridgePanelIndicator?.fillCircle(0, 0, 6);
    this.bridgePanelIndicator?.fillStyle(
      this.bridge.isRepaired ? 0xaec99a : ready ? 0xe9bf72 : 0xd07b5b,
      0.22,
    );
    this.bridgePanelIndicator?.fillCircle(0, 0, 15);
    if (this.bridge.isRepaired) {
      this.bridgeLabel.setText("BRIDGE REPAIRED");
      return;
    }
    if (this.bridge.isRepairing) {
      this.bridgeLabel.setText("BRIDGE EXTENDING...");
      return;
    }
    this.bridgeLabel.setText(
      ready ? "E · REPAIR BRIDGE" : "BRIDGE OUT · POWER A + B",
    );
  }

  private addMarkerLabel(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, this.markerTextStyle("#e5d4af", 9))
      .setOrigin(0.5)
      .setDepth(5);
  }

  private markerTextStyle(color: string, size: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      color,
      fontStyle: "bold",
      stroke: "#202725",
      strokeThickness: 4,
      letterSpacing: 0.5,
    };
  }

  private createPlayerCar() {
    const car = this.add.container(MOUNTAIN_START.x, MOUNTAIN_START.y).setDepth(7);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x101514, 0.46);
    graphics.fillRoundedRect(
      -VEHICLE_LENGTH / 2 + 5,
      -VEHICLE_WIDTH / 2 + 7,
      VEHICLE_LENGTH,
      VEHICLE_WIDTH,
      10,
    );
    graphics.fillStyle(0xb3b4a2, 1);
    graphics.fillRoundedRect(
      -VEHICLE_LENGTH / 2,
      -VEHICLE_WIDTH / 2,
      VEHICLE_LENGTH,
      VEHICLE_WIDTH,
      10,
    );
    graphics.fillStyle(0x333d3e, 1);
    graphics.fillRoundedRect(-12, -VEHICLE_WIDTH / 2 + 5, 25, VEHICLE_WIDTH - 10, 6);
    graphics.fillStyle(0x829092, 0.9);
    graphics.fillRoundedRect(-8, -VEHICLE_WIDTH / 2 + 7, 17, VEHICLE_WIDTH - 14, 4);
    graphics.fillStyle(0xe5ca86, 0.045);
    graphics.fillTriangle(
      VEHICLE_LENGTH / 2 - 3,
      -VEHICLE_WIDTH / 2 + 5,
      VEHICLE_LENGTH / 2 + 116,
      -VEHICLE_WIDTH * 0.72,
      VEHICLE_LENGTH / 2 + 116,
      VEHICLE_WIDTH * 0.72,
    );
    graphics.fillStyle(0xe9d59c, 0.07);
    graphics.fillTriangle(
      VEHICLE_LENGTH / 2 - 3,
      -VEHICLE_WIDTH / 2 + 5,
      VEHICLE_LENGTH / 2 + 68,
      -VEHICLE_WIDTH * 0.48,
      VEHICLE_LENGTH / 2 + 68,
      VEHICLE_WIDTH * 0.48,
    );
    graphics.fillStyle(0xe8e5ce, 1);
    graphics.fillRoundedRect(VEHICLE_LENGTH / 2 - 8, -VEHICLE_WIDTH / 2 + 5, 5, 8, 2);
    graphics.fillRoundedRect(VEHICLE_LENGTH / 2 - 8, VEHICLE_WIDTH / 2 - 13, 5, 8, 2);
    graphics.fillStyle(0xb75c4d, 1);
    graphics.fillRoundedRect(-VEHICLE_LENGTH / 2 + 3, -VEHICLE_WIDTH / 2 + 5, 4, 7, 2);
    graphics.fillRoundedRect(-VEHICLE_LENGTH / 2 + 3, VEHICLE_WIDTH / 2 - 12, 4, 7, 2);
    car.add(graphics);
    return car;
  }
}
