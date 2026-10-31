import * as Phaser from "phaser";
import {
  BUILDINGS,
  BARRIER,
  DESTINATION,
  isBlocked,
  isOnRoad,
  MAP_HEIGHT,
  MAP_WIDTH,
  PARKING_AREAS,
  PARKED_CARS,
  ROAD_SIGNS,
  ROAD_SEGMENTS,
  ROUTE,
  START,
  STREETLIGHTS,
  SWITCH,
  TRAFFIC_CONES,
  TREES,
} from "./world";
import { PuzzleSwitch, RoadBarrier } from "./puzzle-objects";
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

export type GameSnapshot = {
  speed: number;
  elapsed: number;
  x: number;
  y: number;
  routeIndex: number;
  collisions: number;
  heading: number;
  paused: boolean;
  won: boolean;
  nearSwitch: boolean;
  puzzleActivated: boolean;
  levelCompleted: boolean;
}

export type TouchControl = keyof DrivingControls;

export default class EscapeRouteScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private car!: Phaser.GameObjects.Container;
  private puzzleSwitch = new PuzzleSwitch(SWITCH);
  private roadBarrier = new RoadBarrier(BARRIER);
  private switchIndicator!: Phaser.GameObjects.Graphics;
  private switchLabel!: Phaser.GameObjects.Text;
  private destinationIndicator!: Phaser.GameObjects.Graphics;
  private barrierContainer!: Phaser.GameObjects.Container;
  private barrierLabel!: Phaser.GameObjects.Text;
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
  private routeIndex = 0;
  private collisions = 0;
  private collisionCooldown = 0;
  private paused = false;
  private won = false;
  private nearSwitch = false;
  private levelCompleted = false;
  private onHudUpdate: (snapshot: GameSnapshot) => void;
  private readonly carCorners = Array.from({ length: 4 }, () => ({
    x: 0,
    y: 0,
  }));

  constructor(onHudUpdate: (snapshot: GameSnapshot) => void) {
    super({ key: "EscapeRouteScene" });
    this.onHudUpdate = onHudUpdate;
  }

  create() {
    this.puzzleSwitch = new PuzzleSwitch(SWITCH);
    this.roadBarrier = new RoadBarrier(BARRIER);
    this.drawCity();
    this.drawMarkers();
    this.drawPuzzleObjects();
    this.vehicle = createVehicle(START.x, START.y, START.angle);
    this.car = this.createPlayerCar();
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.car, true, 0.075, 0.075);
    this.setupKeyboard();
    this.emitHud();
  }

  update(_time: number, deltaMilliseconds: number) {
    const deltaSeconds = deltaMilliseconds / 1000;
    const escapeDown = this.pauseKey.isDown;
    if (escapeDown && !this.pauseKeyWasDown) {
      this.setPaused(!this.paused);
    }
    this.pauseKeyWasDown = escapeDown;

    if (this.paused || this.won) {
      return;
    }
    if (this.interactionKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.interact();
    }

    const dt = Math.min(deltaSeconds, 0.04);
    this.elapsed += dt;
    this.hudAccumulator += dt;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    this.nearSwitch = this.puzzleSwitch.isNearby(this.vehicle);
    this.updateRouteProgress();

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
    const offRoad = this.carCorners.some((corner) => !isOnRoad(corner));
    const collision = getVehicleCollisionPoints(this.vehicle).some(
      (corner) => isBlocked(corner) || this.roadBarrier.blocks(corner),
    );

    if (offRoad || collision) {
      if (this.collisionCooldown === 0) {
        this.collisions += 1;
        this.collisionCooldown = 1;
      }
      this.vehicle.x = previous.x;
      this.vehicle.y = previous.y;
      this.vehicle.angle = previous.angle;
      this.vehicle.speed *= collision ? -0.16 : 0.12;
      this.vehicle.lateralSpeed *= -0.18;
    }

    this.car.setPosition(this.vehicle.x, this.vehicle.y);
    this.car.setRotation(this.vehicle.angle);

    if (
      this.roadBarrier.isOpen &&
      !this.levelCompleted &&
      Phaser.Math.Distance.Between(
      this.vehicle.x,
      this.vehicle.y,
      DESTINATION.x,
      DESTINATION.y,
      ) < 76
    ) {
      this.won = true;
      this.paused = true;
      this.levelCompleted = true;
      this.vehicle.speed = 0;
      this.vehicle.lateralSpeed = 0;
      playArrivalSound();
      this.tweens.add({
        targets: this.destinationIndicator,
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

  interact() {
    if (!this.puzzleSwitch.activate(this.vehicle)) return;
    playSwitchSound();
    this.roadBarrier.open();
    playBarrierSound();
    this.tweens.killTweensOf(this.barrierContainer);
    this.tweens.add({
      targets: this.barrierContainer,
      y: BARRIER.y - 100,
      alpha: 0.14,
      duration: 900,
      ease: "Cubic.easeIn",
    });
    this.barrierLabel.setText("ACCESS OPEN");
    this.switchLabel.setText("CIRCUIT LIVE");
    this.updateSwitchIndicator();
    this.updateDestinationIndicator();
    this.emitHud();
  }

  continueLevel() {
    if (!this.won) return;
    this.won = false;
    this.paused = false;
    this.emitHud();
  }

  restart() {
    this.vehicle = createVehicle(START.x, START.y, START.angle);
    this.elapsed = 0;
    this.hudAccumulator = 0;
    this.routeIndex = 0;
    this.collisions = 0;
    this.collisionCooldown = 0;
    this.paused = false;
    this.won = false;
    this.nearSwitch = false;
    this.levelCompleted = false;
    this.puzzleSwitch.reset();
    this.roadBarrier.reset();
    this.tweens.killTweensOf(this.barrierContainer);
    this.barrierContainer.setPosition(BARRIER.x, BARRIER.y).setAlpha(1);
    this.barrierLabel.setText("ROAD CLOSED");
    this.switchLabel.setText("E · ACTIVATE");
    this.updateSwitchIndicator();
    this.updateDestinationIndicator();
    this.touchControls = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
    };
    this.car.setPosition(START.x, START.y);
    this.car.setRotation(START.angle);
    this.cameras.main.centerOn(START.x, START.y);
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
        this.touchControls.brake ||
        this.keys.brake.some((key) => key.isDown),
      left:
        this.touchControls.left || this.keys.left.some((key) => key.isDown),
      right:
        this.touchControls.right || this.keys.right.some((key) => key.isDown),
    };
  }

  private updateRouteProgress() {
    while (
      this.routeIndex < ROUTE.length - 1 &&
      Phaser.Math.Distance.Between(
        this.vehicle.x,
        this.vehicle.y,
        ROUTE[this.routeIndex + 1].x,
        ROUTE[this.routeIndex + 1].y,
      ) < 102
    ) {
      this.routeIndex += 1;
    }
  }

  private emitHud() {
    this.onHudUpdate({
      speed: Math.round(Math.abs(this.vehicle.speed) * 0.31),
      elapsed: this.elapsed,
      x: this.vehicle.x,
      y: this.vehicle.y,
      routeIndex: this.routeIndex,
      collisions: this.collisions,
      heading: this.vehicle.angle,
      paused: this.paused,
      won: this.won,
      nearSwitch: this.nearSwitch,
      puzzleActivated: this.puzzleSwitch.isActivated,
      levelCompleted: this.levelCompleted,
    });
  }

  private drawCity() {
    this.add.rectangle(
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2,
      MAP_WIDTH,
      MAP_HEIGHT,
      0x687263,
    );

    const ground = this.add.graphics();
    ground.fillStyle(0x5d6859, 0.32);
    let seed = 81427;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let index = 0; index < 1150; index += 1) {
      const x = random() * MAP_WIDTH;
      const y = random() * MAP_HEIGHT;
      const radius = 1 + random() * 2.8;
      ground.fillCircle(x, y, radius);
    }

    this.drawSidewalks(ground);
    this.drawRoadSurfaces(ground);
    this.drawRoadMarkings(ground);
    this.drawParkingAreas(ground);
    this.drawStreetFixtures(ground);
    this.drawBuildings(ground);
    this.drawTrees(ground);
    this.drawParkedCars();
  }

  private drawSidewalks(graphics: Phaser.GameObjects.Graphics) {
    ROAD_SEGMENTS.forEach((road) => {
      const sidewalkWidth = road.width + 34;
      graphics.lineStyle(sidewalkWidth, 0x827f72, 1);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.fillStyle(0x827f72, 1);
      graphics.fillCircle(road.from.x, road.from.y, sidewalkWidth / 2);
      graphics.fillCircle(road.to.x, road.to.y, sidewalkWidth / 2);
      graphics.lineStyle(2, 0xa59c87, 0.42);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
    });
  }

  private drawRoadSurfaces(graphics: Phaser.GameObjects.Graphics) {
    ROAD_SEGMENTS.forEach((road) => {
      graphics.lineStyle(road.width + 8, 0x363c3d, 1);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.fillStyle(0x363c3d, 1);
      graphics.fillCircle(road.from.x, road.from.y, (road.width + 8) / 2);
      graphics.fillCircle(road.to.x, road.to.y, (road.width + 8) / 2);
      graphics.lineStyle(road.width, 0x414748, 1);
      graphics.lineBetween(road.from.x, road.from.y, road.to.x, road.to.y);
      graphics.fillStyle(0x414748, 1);
      graphics.fillCircle(road.from.x, road.from.y, road.width / 2);
      graphics.fillCircle(road.to.x, road.to.y, road.width / 2);
    });

    let seed = 9821;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    graphics.fillStyle(0x8e948d, 0.16);
    for (let index = 0; index < 1250; index += 1) {
      const road = ROAD_SEGMENTS[Math.floor(random() * ROAD_SEGMENTS.length)];
      const t = random();
      const centerX = road.from.x + (road.to.x - road.from.x) * t;
      const centerY = road.from.y + (road.to.y - road.from.y) * t;
      const offset = (random() - 0.5) * road.width * 0.78;
      const length = Math.hypot(
        road.to.x - road.from.x,
        road.to.y - road.from.y,
      );
      const normalX = -(road.to.y - road.from.y) / length;
      const normalY = (road.to.x - road.from.x) / length;
      graphics.fillCircle(
        centerX + normalX * offset,
        centerY + normalY * offset,
        0.7 + random() * 1.4,
      );
    }
  }

  private drawRoadMarkings(graphics: Phaser.GameObjects.Graphics) {
    ROAD_SEGMENTS.forEach((road, index) => {
      const dx = road.to.x - road.from.x;
      const dy = road.to.y - road.from.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      const nx = -uy;
      const ny = ux;
      const dashLength = 28;
      const gap = 26;
      const endPadding = index < 4 ? 55 : 30;

      for (let distance = endPadding; distance < length - endPadding; distance += dashLength + gap) {
        const end = Math.min(distance + dashLength, length - endPadding);
        const x1 = road.from.x + ux * distance;
        const y1 = road.from.y + uy * distance;
        const x2 = road.from.x + ux * end;
        const y2 = road.from.y + uy * end;

        graphics.lineStyle(2, 0xd4ba76, 0.88);
        graphics.lineBetween(x1 + nx * 4, y1 + ny * 4, x2 + nx * 4, y2 + ny * 4);
        graphics.lineBetween(x1 - nx * 4, y1 - ny * 4, x2 - nx * 4, y2 - ny * 4);

        if (road.width >= 160) {
          graphics.lineStyle(2, 0xb8bdb6, 0.5);
          graphics.lineBetween(
            x1 + nx * road.width * 0.34,
            y1 + ny * road.width * 0.34,
            x2 + nx * road.width * 0.34,
            y2 + ny * road.width * 0.34,
          );
          graphics.lineBetween(
            x1 - nx * road.width * 0.34,
            y1 - ny * road.width * 0.34,
            x2 - nx * road.width * 0.34,
            y2 - ny * road.width * 0.34,
          );
        }
      }
    });
  }

  private drawParkingAreas(graphics: Phaser.GameObjects.Graphics) {
    PARKING_AREAS.forEach((lot) => {
      graphics.fillStyle(0x282f30, 0.4);
      graphics.fillRoundedRect(
        lot.x - lot.width / 2 + 5,
        lot.y - lot.height / 2 + 7,
        lot.width,
        lot.height,
        5,
      );
      graphics.fillStyle(0x555b56, 1);
      graphics.fillRoundedRect(
        lot.x - lot.width / 2,
        lot.y - lot.height / 2,
        lot.width,
        lot.height,
        5,
      );
      graphics.lineStyle(2, 0xd0c39e, 0.6);
      for (let x = lot.x - lot.width / 2 + 8; x < lot.x + lot.width / 2; x += 32) {
        graphics.lineBetween(
          x,
          lot.y - lot.height / 2 + 5,
          x,
          lot.y + lot.height / 2 - 5,
        );
      }
      graphics.lineStyle(2, 0xd7d1bd, 0.42);
      graphics.strokeRoundedRect(
        lot.x - lot.width / 2,
        lot.y - lot.height / 2,
        lot.width,
        lot.height,
        5,
      );
    });
  }

  private drawStreetFixtures(graphics: Phaser.GameObjects.Graphics) {
    STREETLIGHTS.forEach((light) => {
      graphics.fillStyle(0xe4c682, 0.09);
      graphics.fillCircle(light.x, light.y, 52);
      graphics.fillStyle(0x212626, 0.48);
      graphics.fillCircle(light.x + 5, light.y + 7, 12);
      graphics.lineStyle(6, 0x343b3a, 1);
      graphics.lineBetween(light.x, light.y + 3, light.x, light.y - 22);
      graphics.lineStyle(2, 0xb9ad91, 0.8);
      graphics.lineBetween(light.x, light.y - 20, light.x + 10, light.y - 25);
      graphics.fillStyle(0xf1d997, 0.9);
      graphics.fillRoundedRect(light.x + 7, light.y - 29, 11, 6, 2);
      graphics.fillStyle(0xffe6a3, 0.16);
      graphics.fillCircle(light.x + 12, light.y - 25, 16);
    });

    ROAD_SIGNS.forEach((sign) => {
      graphics.fillStyle(0x242a29, 0.48);
      graphics.fillCircle(sign.x + 4, sign.y + 5, 15);
      graphics.lineStyle(4, 0x424945, 1);
      graphics.lineBetween(sign.x, sign.y + 8, sign.x, sign.y - 17);
      graphics.fillStyle(0x31403c, 1);
      graphics.fillRoundedRect(sign.x - 19, sign.y - 31, 38, 22, 3);
      graphics.lineStyle(2, 0xd1bc88, 0.88);
      graphics.strokeRoundedRect(sign.x - 19, sign.y - 31, 38, 22, 3);
      graphics.fillStyle(0xe0c891, 0.95);
      graphics.fillTriangle(
        sign.x - 8,
        sign.y - 21,
        sign.x + 8,
        sign.y - 21,
        sign.x,
        sign.y - 13,
      );
    });

    TRAFFIC_CONES.forEach((cone) => {
      graphics.fillStyle(0x1e2524, 0.45);
      graphics.fillEllipse(cone.x + 3, cone.y + 7, 34, 16);
      graphics.fillStyle(0xb65740, 1);
      graphics.fillTriangle(
        cone.x,
        cone.y - 15,
        cone.x - 13,
        cone.y + 12,
        cone.x + 13,
        cone.y + 12,
      );
      graphics.fillStyle(0xe1d0aa, 0.95);
      graphics.fillRect(cone.x - 8, cone.y + 1, 16, 4);
      graphics.fillStyle(0xc5b99c, 1);
      graphics.fillRoundedRect(cone.x - 15, cone.y + 10, 30, 6, 2);
    });
  }

  private drawBuildings(graphics: Phaser.GameObjects.Graphics) {
    BUILDINGS.forEach((building, index) => {
      graphics.fillStyle(0x222724, 0.34);
      graphics.fillRoundedRect(
        building.x - building.width / 2 + 13,
        building.y - building.height / 2 + 15,
        building.width,
        building.height,
        12,
      );
      graphics.fillStyle(0x4b514c, 1);
      graphics.fillRoundedRect(
        building.x - building.width / 2,
        building.y - building.height / 2 + 7,
        building.width,
        building.height,
        10,
      );
      graphics.fillStyle(building.color, 1);
      graphics.fillRoundedRect(
        building.x - building.width / 2,
        building.y - building.height / 2,
        building.width,
        building.height,
        10,
      );
      graphics.fillStyle(building.roof, 0.82);
      graphics.fillRoundedRect(
        building.x - building.width / 2 + 8,
        building.y - building.height / 2 + 8,
        building.width - 16,
        building.height - 16,
        7,
      );
      graphics.lineStyle(2, 0xddd0b5, 0.38);
      graphics.strokeRoundedRect(
        building.x - building.width / 2 + 8,
        building.y - building.height / 2 + 8,
        building.width - 16,
        building.height - 16,
        7,
      );
      graphics.fillStyle(0x5b625e, 0.7);
      const ventX = building.x + (index % 2 === 0 ? -building.width * 0.2 : building.width * 0.2);
      graphics.fillRoundedRect(ventX - 18, building.y - 12, 36, 24, 4);
      graphics.lineStyle(1, 0xd9d3c4, 0.35);
      graphics.lineBetween(ventX - 12, building.y - 5, ventX + 12, building.y - 5);
      graphics.lineBetween(ventX - 12, building.y, ventX + 12, building.y);
      graphics.lineBetween(ventX - 12, building.y + 5, ventX + 12, building.y + 5);
    });
  }

  private drawTrees(graphics: Phaser.GameObjects.Graphics) {
    TREES.forEach((tree, index) => {
      const radius = 18 + (index % 3) * 2;
      graphics.fillStyle(0x222922, 0.34);
      graphics.fillCircle(tree.x + 5, tree.y + 8, radius + 3);
      graphics.fillStyle(0x4c4539, 1);
      graphics.fillCircle(tree.x, tree.y + 4, 7);
      graphics.fillStyle(index % 2 ? 0x425346 : 0x4a5949, 1);
      graphics.fillCircle(tree.x, tree.y, radius);
      graphics.fillStyle(index % 2 ? 0x697260 : 0x707662, 0.56);
      graphics.fillCircle(tree.x - 5, tree.y - 6, radius * 0.56);
    });
  }

  private drawParkedCars() {
    PARKED_CARS.forEach((car) => {
      const parkedCar = this.add
        .container(car.x, car.y)
        .setRotation(car.angle)
        .setDepth(1);
      const shadow = this.add.graphics();
      shadow.fillStyle(0x171b1c, 0.42);
      shadow.fillRoundedRect(-VEHICLE_LENGTH / 2 + 5, -12, VEHICLE_LENGTH, VEHICLE_WIDTH, 10);
      const body = this.add.graphics();
      this.drawCarShape(body, car.color, 0.9);
      parkedCar.add([shadow, body]);
    });
  }

  private drawMarkers() {
    const start = this.add.container(START.x, START.y).setDepth(3);
    const startGraphics = this.add.graphics();
    startGraphics.fillStyle(0xe4b866, 0.16);
    startGraphics.fillCircle(0, 0, 58);
    startGraphics.lineStyle(3, 0xe7bd70, 0.82);
    startGraphics.strokeCircle(0, 0, 35);
    startGraphics.fillStyle(0xe7bd70, 1);
    startGraphics.fillCircle(0, 0, 6);
    start.add(startGraphics);
    this.tweens.add({
      targets: start,
      scale: { from: 0.88, to: 1.08 },
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const destination = this.add.container(
      DESTINATION.x,
      DESTINATION.y,
    ).setDepth(3);
    const destinationGraphics = this.add.graphics();
    destinationGraphics.fillStyle(0xc87c50, 0.14);
    destinationGraphics.fillCircle(0, 0, 76);
    destinationGraphics.lineStyle(3, 0xd78f62, 0.92);
    destinationGraphics.strokeCircle(0, 0, 46);
    destination.add(destinationGraphics);
    this.destinationIndicator = this.add.graphics();
    destination.add(this.destinationIndicator);
    this.updateDestinationIndicator();
    this.tweens.add({
      targets: destination,
      scale: { from: 0.86, to: 1.1 },
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(START.x, START.y + 72, "START · CANAL STREET", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#f0d39a",
        fontStyle: "bold",
        stroke: "#222625",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.add
      .text(DESTINATION.x, DESTINATION.y - 78, "THE STUDIO · ARRIVAL", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#e5aa80",
        fontStyle: "bold",
        stroke: "#222625",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  private drawPuzzleObjects() {
    const switchAssembly = this.add
      .container(SWITCH.x, SWITCH.y)
      .setDepth(4);
    const switchBase = this.add.graphics();
    switchBase.fillStyle(0x171d1c, 0.45);
    switchBase.fillEllipse(5, 13, 104, 45);
    switchBase.fillStyle(0x555c55, 1);
    switchBase.fillRoundedRect(-43, -30, 86, 62, 8);
    switchBase.fillStyle(0x293230, 1);
    switchBase.fillRoundedRect(-37, -25, 74, 49, 6);
    switchBase.lineStyle(2, 0x9b947f, 0.74);
    switchBase.strokeRoundedRect(-37, -25, 74, 49, 6);
    switchBase.fillStyle(0x9b947f, 0.8);
    for (const x of [-30, 30]) {
      for (const y of [-18, 17]) {
        switchBase.fillCircle(x, y, 2);
      }
    }
    switchBase.fillStyle(0x7d8174, 1);
    switchBase.fillRoundedRect(-14, -16, 28, 30, 6);
    switchBase.fillStyle(0x262c2b, 1);
    switchBase.fillRoundedRect(-8, -9, 16, 20, 4);
    switchAssembly.add(switchBase);

    this.switchIndicator = this.add.graphics();
    switchAssembly.add(this.switchIndicator);
    this.updateSwitchIndicator();
    this.tweens.add({
      targets: this.switchIndicator,
      alpha: { from: 0.55, to: 1 },
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(SWITCH.x, SWITCH.y - 48, "STREET CONTROL", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#e1c98f",
        fontStyle: "bold",
        stroke: "#202725",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.switchLabel = this.add
      .text(SWITCH.x, SWITCH.y + 47, "E · ACTIVATE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#d3d4c7",
        fontStyle: "bold",
        stroke: "#202725",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.barrierContainer = this.add
      .container(BARRIER.x, BARRIER.y)
      .setDepth(4);
    const barrierGraphic = this.add.graphics();
    barrierGraphic.fillStyle(0x171a19, 0.54);
    barrierGraphic.fillRoundedRect(
      -BARRIER.width / 2 + 4,
      -BARRIER.height / 2 + 7,
      BARRIER.width,
      BARRIER.height,
      4,
    );
    barrierGraphic.fillStyle(0x383c39, 1);
    barrierGraphic.fillRoundedRect(
      -BARRIER.width / 2,
      -BARRIER.height / 2,
      BARRIER.width,
      BARRIER.height,
      4,
    );
    for (let index = 0; index < 10; index += 1) {
      barrierGraphic.fillStyle(index % 2 ? 0xeee1c1 : 0xb65543, 1);
      barrierGraphic.fillRect(
        -BARRIER.width / 2 + 4 + index * 14,
        -BARRIER.height / 2 + 3,
        10,
        BARRIER.height - 6,
      );
    }
    barrierGraphic.lineStyle(2, 0x252928, 1);
    barrierGraphic.strokeRoundedRect(
      -BARRIER.width / 2,
      -BARRIER.height / 2,
      BARRIER.width,
      BARRIER.height,
      4,
    );
    this.barrierContainer.add(barrierGraphic);
    this.barrierLabel = this.add
      .text(BARRIER.x, BARRIER.y - 31, "ROAD CLOSED", {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        color: "#e6d9bb",
        fontStyle: "bold",
        stroke: "#252928",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  private updateSwitchIndicator() {
    this.switchIndicator?.clear();
    this.switchIndicator?.fillStyle(
      this.puzzleSwitch.isActivated ? 0x9eb78b : 0xd2a65e,
      1,
    );
    this.switchIndicator?.fillCircle(0, -1, 6);
    this.switchIndicator?.fillStyle(
      this.puzzleSwitch.isActivated ? 0xaec99a : 0xe9bf72,
      0.22,
    );
    this.switchIndicator?.fillCircle(0, -1, 17);
  }

  private updateDestinationIndicator() {
    this.destinationIndicator?.clear();
    this.destinationIndicator?.fillStyle(
      this.roadBarrier?.isOpen ? 0xd78f62 : 0x898273,
      this.roadBarrier?.isOpen ? 1 : 0.55,
    );
    this.destinationIndicator?.fillCircle(0, 0, this.roadBarrier?.isOpen ? 9 : 6);
  }

  private createPlayerCar() {
    const car = this.add.container(START.x, START.y).setDepth(5);
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
    this.drawCarShape(body, 0xc7c0ad, 1);
    car.add([shadow, body]);
    return car;
  }

  private drawCarShape(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    opacity: number,
  ) {
    const length = VEHICLE_LENGTH;
    const width = VEHICLE_WIDTH;
    graphics.fillStyle(0x171b1c, opacity);
    graphics.fillRoundedRect(-length / 2, -width / 2, length, width, 11);
    graphics.fillStyle(color, opacity);
    graphics.fillRoundedRect(
      -length / 2 + 3,
      -width / 2 + 2,
      length - 6,
      width - 5,
      10,
    );
    graphics.fillStyle(0x313a3c, opacity);
    graphics.fillRoundedRect(-11, -width / 2 + 5, 25, width - 11, 7);
    graphics.fillStyle(0x829092, opacity * 0.78);
    graphics.fillRoundedRect(-8, -width / 2 + 7, 18, width - 15, 5);
    graphics.fillStyle(0xeff0db, opacity);
    graphics.fillRoundedRect(length / 2 - 8, -width / 2 + 5, 5, 8, 2);
    graphics.fillRoundedRect(length / 2 - 8, width / 2 - 13, 5, 8, 2);
    graphics.fillStyle(0xc05649, opacity);
    graphics.fillRoundedRect(-length / 2 + 3, -width / 2 + 5, 4, 7, 2);
    graphics.fillRoundedRect(-length / 2 + 3, width / 2 - 12, 4, 7, 2);
    graphics.fillStyle(0x222829, opacity);
    graphics.fillRoundedRect(-length / 2 + 14, -width / 2 - 3, 17, 5, 2);
    graphics.fillRoundedRect(length / 2 - 31, -width / 2 - 3, 17, 5, 2);
    graphics.fillRoundedRect(-length / 2 + 14, width / 2 - 2, 17, 5, 2);
    graphics.fillRoundedRect(length / 2 - 31, width / 2 - 2, 17, 5, 2);
    graphics.lineStyle(1, 0xf0ead8, opacity * 0.55);
    graphics.lineBetween(-length / 2 + 10, 0, length / 2 - 10, 0);
  }
}
