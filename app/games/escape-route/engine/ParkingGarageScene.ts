import * as Phaser from "phaser";
import {
  GARAGE_BARRIER,
  GARAGE_BAYS,
  GARAGE_CARS,
  GARAGE_DESTINATION,
  GARAGE_HEIGHT,
  GARAGE_PILLARS,
  GARAGE_ROADS,
  GARAGE_START,
  GARAGE_WIDTH,
  isAgainstOneWayLane,
  isGarageObstacle,
  isOnGarageRoad,
  ONE_WAY_ARROWS,
  TERMINAL_POINT,
  TICKET_POINT,
} from "./parking-garage-world";
import { PaymentTerminal, ParkingTicket } from "./parking-puzzle";
import { RoadBarrier } from "./puzzle-objects";
import {
  playArrivalSound,
  playBarrierSound,
  playSwitchSound,
} from "./audio-feedback";
import {
  createVehicle,
  getVehicleCollisionPoints,
  getVehicleCorners,
  stepVehicle,
  VEHICLE_LENGTH,
  VEHICLE_WIDTH,
  type DrivingControls,
  type Vehicle,
} from "./vehicle-system";
import type { GameSnapshot, TouchControl } from "./EscapeRouteScene";

export type ParkingGarageSnapshot = GameSnapshot & {
  ticketCollected: boolean;
  terminalActivated: boolean;
  nearTicket: boolean;
  nearTerminal: boolean;
};

export default class ParkingGarageScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private car!: Phaser.GameObjects.Container;
  private ticket = new ParkingTicket();
  private terminal = new PaymentTerminal();
  private barrier = new RoadBarrier(GARAGE_BARRIER);
  private barrierContainer!: Phaser.GameObjects.Container;
  private barrierLabel!: Phaser.GameObjects.Text;
  private ticketGraphics!: Phaser.GameObjects.Graphics;
  private ticketLabel!: Phaser.GameObjects.Text;
  private terminalIndicator!: Phaser.GameObjects.Graphics;
  private terminalLabel!: Phaser.GameObjects.Text;
  private exitIndicator!: Phaser.GameObjects.Graphics;
  private touchControls: DrivingControls = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
  };
  private keys!: Record<keyof DrivingControls, Phaser.Input.Keyboard.Key[]>;
  private interactionKeys!: Phaser.Input.Keyboard.Key[];
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private pauseKeyWasDown = false;
  private elapsed = 0;
  private hudAccumulator = 0;
  private collisions = 0;
  private collisionCooldown = 0;
  private paused = false;
  private won = false;
  private nearTicket = false;
  private nearTerminal = false;
  private onHudUpdate: (snapshot: ParkingGarageSnapshot) => void;
  private readonly carCorners = Array.from({ length: 4 }, () => ({
    x: 0,
    y: 0,
  }));

  constructor(onHudUpdate: (snapshot: ParkingGarageSnapshot) => void) {
    super({ key: "ParkingGarageScene" });
    this.onHudUpdate = onHudUpdate;
  }

  create() {
    this.ticket = new ParkingTicket();
    this.terminal = new PaymentTerminal();
    this.barrier = new RoadBarrier(GARAGE_BARRIER);
    this.drawGarage();
    this.drawPuzzleObjects();
    this.vehicle = createVehicle(
      GARAGE_START.x,
      GARAGE_START.y,
      GARAGE_START.angle,
    );
    this.car = this.createPlayerCar();
    this.cameras.main.setBounds(0, 0, GARAGE_WIDTH, GARAGE_HEIGHT);
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

    if (this.interactionKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.interact();
    }

    const dt = Math.min(deltaMilliseconds / 1000, 0.04);
    this.elapsed += dt;
    this.hudAccumulator += dt;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    this.nearTicket = this.ticket.isNearby(this.vehicle);
    this.nearTerminal = this.terminal.isNearby(this.vehicle);

    const previous = {
      x: this.vehicle.x,
      y: this.vehicle.y,
      angle: this.vehicle.angle,
    };
    stepVehicle(this.vehicle, this.getControls(), dt);

    const corners = getVehicleCorners(this.vehicle);
    for (let index = 0; index < corners.length; index += 1) {
      this.carCorners[index] = corners[index];
    }
    const offRoad = this.carCorners.some((corner) => !isOnGarageRoad(corner));
    const collision =
      isAgainstOneWayLane(
        this.vehicle,
        this.vehicle.angle,
        this.vehicle.speed,
      ) ||
      getVehicleCollisionPoints(this.vehicle).some(
        (point) =>
          isGarageObstacle(point) || this.barrier.blocks(point),
      );

    if (offRoad || collision) {
      if (this.collisionCooldown === 0) {
        this.collisions += 1;
        this.collisionCooldown = 1;
      }
      this.vehicle.x = previous.x;
      this.vehicle.y = previous.y;
      this.vehicle.angle = previous.angle;
      this.vehicle.speed *= collision ? -0.12 : 0.1;
      this.vehicle.lateralSpeed *= -0.16;
    }

    this.car.setPosition(this.vehicle.x, this.vehicle.y);
    this.car.setRotation(this.vehicle.angle);

    if (
      this.barrier.isOpen &&
      Phaser.Math.Distance.Between(
        this.vehicle.x,
        this.vehicle.y,
        GARAGE_DESTINATION.x,
        GARAGE_DESTINATION.y,
      ) < 68
    ) {
      this.won = true;
      this.paused = true;
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

  setPaused(paused: boolean) {
    if (this.won) return;
    this.paused = paused;
    this.emitHud();
  }

  continueLevel() {
    if (!this.won) return;
    this.won = false;
    this.paused = false;
    this.emitHud();
  }

  interact() {
    if (this.ticket.collect(this.vehicle)) {
      playSwitchSound();
      this.ticketGraphics.setVisible(false);
      this.ticketLabel.setText("TICKET COLLECTED");
      this.terminalLabel.setText("E · PAY HERE");
      this.emitHud();
      return;
    }

    if (this.terminal.activate(this.vehicle, this.ticket.isCollected)) {
      playSwitchSound();
      this.barrier.open();
      playBarrierSound();
      this.tweens.killTweensOf(this.barrierContainer);
      this.tweens.add({
        targets: this.barrierContainer,
        y: GARAGE_BARRIER.y - 88,
        alpha: 0.12,
        duration: 850,
        ease: "Cubic.easeIn",
      });
      this.barrierLabel.setText("EXIT OPEN");
      this.terminalLabel.setText("PAYMENT ACCEPTED");
      this.updateTerminalIndicator();
      this.updateExitIndicator();
      this.emitHud();
      return;
    }

    if (this.nearTerminal && !this.ticket.isCollected) {
      this.terminalLabel.setText("TICKET REQUIRED");
      this.time.delayedCall(1500, () => {
        if (!this.terminal.isActivated && !this.ticket.isCollected) {
          this.terminalLabel.setText("TICKET PAYMENT");
        }
      });
    }
  }

  restart() {
    this.vehicle = createVehicle(
      GARAGE_START.x,
      GARAGE_START.y,
      GARAGE_START.angle,
    );
    this.elapsed = 0;
    this.hudAccumulator = 0;
    this.collisions = 0;
    this.collisionCooldown = 0;
    this.paused = false;
    this.won = false;
    this.nearTicket = false;
    this.nearTerminal = false;
    this.ticket.reset();
    this.terminal.reset();
    this.barrier.reset();
    this.tweens.killTweensOf(this.barrierContainer);
    this.barrierContainer
      .setPosition(GARAGE_BARRIER.x, GARAGE_BARRIER.y)
      .setAlpha(1);
    this.barrierLabel.setText("EXIT CLOSED");
    this.ticketGraphics.setVisible(true);
    this.ticketLabel.setText("E · TAKE TICKET");
    this.terminalLabel.setText("TICKET PAYMENT");
    this.updateTerminalIndicator();
    this.updateExitIndicator();
    this.touchControls = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
    };
    this.car.setPosition(GARAGE_START.x, GARAGE_START.y);
    this.car.setRotation(GARAGE_START.angle);
    this.cameras.main.centerOn(GARAGE_START.x, GARAGE_START.y);
    this.emitHud();
  }

  setTouchControl(control: TouchControl, active: boolean) {
    this.touchControls[control] = active;
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

  private emitHud() {
    this.onHudUpdate({
      speed: Math.round(Math.abs(this.vehicle.speed) * 0.31),
      signedSpeed: this.vehicle.speed,
      elapsed: this.elapsed,
      x: this.vehicle.x,
      y: this.vehicle.y,
      heading: this.vehicle.angle,
      routeIndex: this.ticket.isCollected ? (this.terminal.isActivated ? 2 : 1) : 0,
      collisions: this.collisions,
      paused: this.paused,
      won: this.won,
      nearSwitch: false,
      puzzleActivated: this.terminal.isActivated,
      levelCompleted: this.won,
      ticketCollected: this.ticket.isCollected,
      terminalActivated: this.terminal.isActivated,
      nearTicket: this.nearTicket,
      nearTerminal: this.nearTerminal,
    });
  }

  private drawGarage() {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x474a48, 1);
    graphics.fillRect(0, 0, GARAGE_WIDTH, GARAGE_HEIGHT);

    graphics.fillStyle(0x555754, 1);
    graphics.fillRect(60, 55, 1680, 1290);
    graphics.lineStyle(3, 0x777a73, 0.42);
    graphics.strokeRect(60, 55, 1680, 1290);

    graphics.lineStyle(1, 0x777973, 0.18);
    for (let x = 120; x < GARAGE_WIDTH - 60; x += 130) {
      graphics.lineBetween(x, 60, x, GARAGE_HEIGHT - 60);
    }
    for (let y = 110; y < GARAGE_HEIGHT - 60; y += 112) {
      graphics.lineBetween(65, y, GARAGE_WIDTH - 65, y);
    }
    graphics.lineStyle(3, 0xc3bca9, 0.42);
    graphics.strokeRect(80, 90, 1640, 1230);

    for (const road of GARAGE_ROADS) {
      graphics.lineStyle(road.width + 20, 0x777a74, 0.8);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.fillStyle(0x626662, 1);
      graphics.fillCircle(road.from.x, road.from.y, (road.width + 20) / 2);
      graphics.fillCircle(road.to.x, road.to.y, (road.width + 20) / 2);
      graphics.lineStyle(road.width, 0x535754, 1);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.fillStyle(0x535754, 1);
      graphics.fillCircle(road.from.x, road.from.y, road.width / 2);
      graphics.fillCircle(road.to.x, road.to.y, road.width / 2);
      graphics.lineStyle(2, 0x858980, 0.42);
      graphics.lineBetween(
        road.from.x,
        road.from.y,
        road.to.x,
        road.to.y,
      );
    }

    this.drawParkingBays(graphics);
    this.drawDirectionArrows(graphics);
    this.drawFloorSigns(graphics);
    this.drawRamps(graphics);
    this.drawLighting(graphics);
    this.drawPillars();
    this.drawParkedCars();
  }

  private drawParkingBays(graphics: Phaser.GameObjects.Graphics) {
    for (const bay of GARAGE_BAYS) {
      graphics.lineStyle(2, 0xd7d0bc, 0.68);
      graphics.lineBetween(
        bay.x - Math.cos(bay.angle) * 24,
        bay.y - Math.sin(bay.angle) * 24,
        bay.x + Math.cos(bay.angle) * 24,
        bay.y + Math.sin(bay.angle) * 24,
      );
      const sideX = -Math.sin(bay.angle) * 31;
      const sideY = Math.cos(bay.angle) * 31;
      graphics.lineBetween(
        bay.x - Math.cos(bay.angle) * 24,
        bay.y - Math.sin(bay.angle) * 24,
        bay.x - Math.cos(bay.angle) * 24 + sideX,
        bay.y - Math.sin(bay.angle) * 24 + sideY,
      );
      graphics.lineBetween(
        bay.x + Math.cos(bay.angle) * 24,
        bay.y + Math.sin(bay.angle) * 24,
        bay.x + Math.cos(bay.angle) * 24 + sideX,
        bay.y + Math.sin(bay.angle) * 24 + sideY,
      );
    }
  }

  private drawDirectionArrows(graphics: Phaser.GameObjects.Graphics) {
    for (const arrow of ONE_WAY_ARROWS) {
      graphics.fillStyle(0xe0d4ae, 0.88);
      graphics.fillTriangle(
        arrow.x + 14,
        arrow.y,
        arrow.x - 6,
        arrow.y - 9,
        arrow.x - 6,
        arrow.y + 9,
      );
      graphics.fillRoundedRect(arrow.x - 17, arrow.y - 3, 12, 6, 2);
    }

    for (const arrow of [
      { x: 1000, y: 338, angle: -Math.PI / 2 },
      { x: 1000, y: 740, angle: -Math.PI / 2 },
      { x: 1480, y: 550, angle: -Math.PI / 2 },
    ]) {
      graphics.lineStyle(3, 0xd3c9ac, 0.72);
      graphics.lineBetween(
        arrow.x - Math.cos(arrow.angle) * 12,
        arrow.y - Math.sin(arrow.angle) * 12,
        arrow.x + Math.cos(arrow.angle) * 12,
        arrow.y + Math.sin(arrow.angle) * 12,
      );
      graphics.lineBetween(
        arrow.x + Math.cos(arrow.angle) * 12,
        arrow.y + Math.sin(arrow.angle) * 12,
        arrow.x + Math.cos(arrow.angle + 2.45) * 4,
        arrow.y + Math.sin(arrow.angle + 2.45) * 4,
      );
      graphics.lineBetween(
        arrow.x + Math.cos(arrow.angle) * 12,
        arrow.y + Math.sin(arrow.angle) * 12,
        arrow.x + Math.cos(arrow.angle - 2.45) * 4,
        arrow.y + Math.sin(arrow.angle - 2.45) * 4,
      );
    }
  }

  private drawFloorSigns(graphics: Phaser.GameObjects.Graphics) {
    const signs = [
      { x: 1000, y: 320, text: "EXIT", color: 0xd6c691 },
      { x: 1480, y: 665, text: "P", color: 0xd4d0bf },
      { x: 250, y: 1160, text: "IN", color: 0xd6c691 },
    ];
    for (const sign of signs) {
      graphics.fillStyle(0x333735, 0.72);
      graphics.fillRoundedRect(sign.x - 23, sign.y - 13, 46, 26, 4);
      this.add
        .text(sign.x, sign.y, sign.text, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: Phaser.Display.Color.IntegerToColor(sign.color).rgba,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(1);
    }
  }

  private drawRamps(graphics: Phaser.GameObjects.Graphics) {
    this.drawRamp(graphics, 250, 1288, Math.PI / 2, "ENTRY RAMP", 0xdaa75d);
    this.drawRamp(graphics, 1000, 112, -Math.PI / 2, "UP TO STREET", 0x9bad8c);
  }

  private drawRamp(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    angle: number,
    label: string,
    color: number,
  ) {
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    graphics.fillStyle(0x343936, 0.9);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(x + normalX * 48, y + normalY * 48),
        new Phaser.Geom.Point(x - normalX * 48, y - normalY * 48),
        new Phaser.Geom.Point(
          x - normalX * 48 + tangentX * 92,
          y - normalY * 48 + tangentY * 92,
        ),
        new Phaser.Geom.Point(
          x + normalX * 48 + tangentX * 92,
          y + normalY * 48 + tangentY * 92,
        ),
      ],
      true,
    );
    graphics.lineStyle(3, color, 0.8);
    for (let step = 0; step < 3; step += 1) {
      const offset = 20 + step * 23;
      graphics.lineBetween(
        x + tangentX * offset - normalX * 30,
        y + tangentY * offset - normalY * 30,
        x + tangentX * offset + normalX * 30,
        y + tangentY * offset + normalY * 30,
      );
    }
    this.add
      .text(x + normalX * 67, y + normalY * 67, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#d7d0bc",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private drawLighting(graphics: Phaser.GameObjects.Graphics) {
    const lights = [
      { x: 300, y: 1000 },
      { x: 530, y: 510 },
      { x: 900, y: 900 },
      { x: 1050, y: 500 },
      { x: 1410, y: 700 },
      { x: 1510, y: 390 },
      { x: 1000, y: 175 },
    ];
    for (const light of lights) {
      graphics.fillStyle(0xdacb9e, 0.035);
      graphics.fillCircle(light.x, light.y, 100);
      graphics.fillStyle(0xe7d8aa, 0.055);
      graphics.fillCircle(light.x, light.y, 53);
      graphics.fillStyle(0xe9ddb7, 0.56);
      graphics.fillCircle(light.x, light.y, 4);
    }
  }

  private drawPillars() {
    for (const pillar of GARAGE_PILLARS) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x202321, 0.35);
      graphics.fillEllipse(8, 12, pillar.radius * 2.5, pillar.radius * 2.1);
      graphics.fillStyle(0x373a38, 1);
      graphics.fillCircle(0, 0, pillar.radius + 3);
      graphics.fillStyle(0x85857c, 1);
      graphics.fillCircle(0, 0, pillar.radius);
      graphics.lineStyle(3, 0xb5b09f, 0.48);
      graphics.strokeCircle(0, 0, pillar.radius - 3);
      graphics.lineStyle(4, 0x5d605b, 0.74);
      graphics.lineBetween(-8, -8, 8, 8);
      graphics.lineBetween(-8, 8, 8, -8);
      this.add
        .container(pillar.x, pillar.y, [graphics])
        .setDepth(3);
    }
  }

  private drawParkedCars() {
    for (const parked of GARAGE_CARS) {
      const car = this.add
        .container(parked.x, parked.y)
        .setRotation(parked.angle)
        .setDepth(3);
      const graphics = this.add.graphics();
      graphics.fillStyle(0x171b1b, 0.48);
      graphics.fillRoundedRect(-31, -15, 68, 36, 9);
      graphics.fillStyle(0x161a1b, 1);
      graphics.fillRoundedRect(-34, -17, 68, 34, 9);
      graphics.fillStyle(parked.color, 1);
      graphics.fillRoundedRect(-31, -15, 62, 29, 8);
      graphics.fillStyle(0x303b3c, 1);
      graphics.fillRoundedRect(-10, -11, 25, 21, 5);
      graphics.fillStyle(0x839091, 0.74);
      graphics.fillRoundedRect(-7, -9, 18, 17, 4);
      graphics.fillStyle(0xd6c9a4, 0.9);
      graphics.fillRoundedRect(25, -10, 4, 6, 2);
      graphics.fillRoundedRect(25, 4, 4, 6, 2);
      car.add(graphics);
    }
  }

  private drawPuzzleObjects() {
    this.drawStartAndExit();
    this.drawTicket();
    this.drawTerminal();
    this.drawBarrier();
  }

  private drawStartAndExit() {
    const start = this.add.graphics().setDepth(2);
    start.lineStyle(3, 0xe2b66f, 0.85);
    start.strokeCircle(GARAGE_START.x, GARAGE_START.y - 42, 18);
    start.lineStyle(2, 0xe2b66f, 0.55);
    start.strokeCircle(GARAGE_START.x, GARAGE_START.y - 42, 26);
    this.add
      .text(GARAGE_START.x + 40, GARAGE_START.y - 44, "LEVEL 02 · ENTRY", {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#e5d7b6",
        letterSpacing: 1,
      })
      .setDepth(4);

    this.exitIndicator = this.add.graphics().setDepth(3);
    this.exitIndicator.fillStyle(0x9bad8c, 0.95);
    this.exitIndicator.fillCircle(0, 0, 8);
    this.exitIndicator.fillStyle(0x9bad8c, 0.2);
    this.exitIndicator.fillCircle(0, 0, 22);
    this.add
      .container(GARAGE_DESTINATION.x, GARAGE_DESTINATION.y + 14, [
        this.exitIndicator,
      ])
      .setDepth(4);
    this.add
      .text(GARAGE_DESTINATION.x + 62, GARAGE_DESTINATION.y + 12, "STREET EXIT", {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#d4d8c4",
        letterSpacing: 1,
      })
      .setDepth(4);
    this.updateExitIndicator();
  }

  private drawTicket() {
    this.ticketGraphics = this.add.graphics().setDepth(5);
    this.ticketGraphics.fillStyle(0x151918, 0.42);
    this.ticketGraphics.fillEllipse(3, 8, 40, 20);
    this.ticketGraphics.fillStyle(0xe1d4b7, 1);
    this.ticketGraphics.fillRoundedRect(-13, -7, 27, 16, 3);
    this.ticketGraphics.lineStyle(1, 0x84775f, 0.7);
    this.ticketGraphics.lineBetween(-8, -2, 7, -2);
    this.ticketGraphics.lineBetween(-8, 2, 3, 2);
    this.ticketGraphics.setPosition(TICKET_POINT.x, TICKET_POINT.y);
    this.add
      .circle(TICKET_POINT.x, TICKET_POINT.y, 23, 0xe1bd79, 0.12)
      .setDepth(4);
    this.ticketLabel = this.add
      .text(TICKET_POINT.x, TICKET_POINT.y + 32, "E · TAKE TICKET", {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        color: "#e1d6bd",
        backgroundColor: "#292d2a",
        padding: { x: 5, y: 4 },
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private drawTerminal() {
    const terminal = this.add.graphics();
    terminal.fillStyle(0x151918, 0.45);
    terminal.fillEllipse(5, 10, 52, 26);
    terminal.fillStyle(0x303633, 1);
    terminal.fillRoundedRect(-17, -25, 34, 51, 5);
    terminal.fillStyle(0x656c65, 1);
    terminal.fillRoundedRect(-12, -20, 24, 40, 3);
    terminal.fillStyle(0x1d2825, 1);
    terminal.fillRoundedRect(-8, -15, 16, 13, 2);
    terminal.fillStyle(0x9bad8c, 0.9);
    terminal.fillCircle(0, -9, 3);
    terminal.fillStyle(0xb4a67f, 0.8);
    for (const y of [2, 8, 14]) {
      terminal.fillCircle(-5, y, 1.4);
      terminal.fillCircle(0, y, 1.4);
      terminal.fillCircle(5, y, 1.4);
    }
    this.add.container(TERMINAL_POINT.x, TERMINAL_POINT.y, [terminal]).setDepth(4);
    this.terminalIndicator = this.add.graphics().setDepth(5);
    this.updateTerminalIndicator();
    this.add
      .container(TERMINAL_POINT.x, TERMINAL_POINT.y, [this.terminalIndicator])
      .setDepth(5);
    this.terminalLabel = this.add
      .text(TERMINAL_POINT.x, TERMINAL_POINT.y + 42, "TICKET PAYMENT", {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        color: "#d6d4c6",
        backgroundColor: "#292d2a",
        padding: { x: 5, y: 4 },
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private drawBarrier() {
    const container = this.add
      .container(GARAGE_BARRIER.x, GARAGE_BARRIER.y)
      .setDepth(6);
    const graphics = this.add.graphics();
    graphics.fillStyle(0x141817, 0.44);
    graphics.fillEllipse(2, 9, GARAGE_BARRIER.width + 20, 26);
    graphics.fillStyle(0x373c38, 1);
    graphics.fillRoundedRect(-7, -20, 14, 40, 4);
    graphics.fillStyle(0xd6d0be, 1);
    graphics.fillRoundedRect(-GARAGE_BARRIER.width / 2, -4, GARAGE_BARRIER.width, 8, 3);
    graphics.fillStyle(0xb55045, 0.95);
    for (let x = -48; x <= 48; x += 24) {
      graphics.fillPoints(
        [
          new Phaser.Geom.Point(x - 5, -4),
          new Phaser.Geom.Point(x + 4, -4),
          new Phaser.Geom.Point(x - 2, 4),
          new Phaser.Geom.Point(x - 11, 4),
        ],
        true,
      );
    }
    container.add(graphics);
    this.barrierContainer = container;
    this.barrierLabel = this.add
      .text(GARAGE_BARRIER.x, GARAGE_BARRIER.y - 27, "EXIT CLOSED", {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#e0d4bd",
        backgroundColor: "#303531",
        padding: { x: 5, y: 4 },
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private updateTerminalIndicator() {
    this.terminalIndicator?.clear();
    this.terminalIndicator?.fillStyle(
      this.terminal.isActivated ? 0x9bad8c : 0xd8b16c,
      1,
    );
    this.terminalIndicator?.fillCircle(0, -19, 4);
    this.terminalIndicator?.fillStyle(
      this.terminal.isActivated ? 0x9bad8c : 0xd8b16c,
      0.22,
    );
    this.terminalIndicator?.fillCircle(0, -19, 12);
  }

  private updateExitIndicator() {
    this.exitIndicator?.clear();
    this.exitIndicator?.fillStyle(
      this.barrier.isOpen ? 0xd4a263 : 0x8e958b,
      this.barrier.isOpen ? 1 : 0.58,
    );
    this.exitIndicator?.fillCircle(0, 0, this.barrier.isOpen ? 10 : 7);
    this.exitIndicator?.fillStyle(
      this.barrier.isOpen ? 0xd4a263 : 0x8e958b,
      0.2,
    );
    this.exitIndicator?.fillCircle(0, 0, 23);
  }

  private createPlayerCar() {
    const car = this.add
      .container(GARAGE_START.x, GARAGE_START.y)
      .setDepth(5);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0b1112, 0.5);
    shadow.fillRoundedRect(
      -VEHICLE_LENGTH / 2 + 5,
      -VEHICLE_WIDTH / 2 + 8,
      VEHICLE_LENGTH,
      VEHICLE_WIDTH,
      12,
    );
    const body = this.add.graphics();
    this.drawCarShape(body);
    car.add([shadow, body]);
    return car;
  }

  private drawCarShape(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x171b1c, 1);
    graphics.fillRoundedRect(
      -VEHICLE_LENGTH / 2,
      -VEHICLE_WIDTH / 2,
      VEHICLE_LENGTH,
      VEHICLE_WIDTH,
      11,
    );
    graphics.fillStyle(0xb8b8a8, 1);
    graphics.fillRoundedRect(
      -VEHICLE_LENGTH / 2 + 3,
      -VEHICLE_WIDTH / 2 + 2,
      VEHICLE_LENGTH - 6,
      VEHICLE_WIDTH - 5,
      10,
    );
    graphics.fillStyle(0x313a3c, 1);
    graphics.fillRoundedRect(-11, -VEHICLE_WIDTH / 2 + 5, 25, VEHICLE_WIDTH - 11, 7);
    graphics.fillStyle(0x829092, 0.78);
    graphics.fillRoundedRect(-8, -VEHICLE_WIDTH / 2 + 7, 18, VEHICLE_WIDTH - 15, 5);
    graphics.fillStyle(0xeff0db, 1);
    graphics.fillRoundedRect(VEHICLE_LENGTH / 2 - 8, -VEHICLE_WIDTH / 2 + 5, 5, 8, 2);
    graphics.fillRoundedRect(VEHICLE_LENGTH / 2 - 8, VEHICLE_WIDTH / 2 - 13, 5, 8, 2);
    graphics.fillStyle(0xc05649, 1);
    graphics.fillRoundedRect(-VEHICLE_LENGTH / 2 + 3, -VEHICLE_WIDTH / 2 + 5, 4, 7, 2);
    graphics.fillRoundedRect(-VEHICLE_LENGTH / 2 + 3, VEHICLE_WIDTH / 2 - 12, 4, 7, 2);
  }
}
