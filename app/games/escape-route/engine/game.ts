import * as Phaser from "phaser";
import EscapeRouteScene, {
  type GameSnapshot,
  type TouchControl,
} from "./EscapeRouteScene";
import ParkingGarageScene, {
  type ParkingGarageSnapshot,
} from "./ParkingGarageScene";
import MountainPassScene, {
  type MountainPassSnapshot,
} from "./MountainPassScene";

export type EscapeRouteController = {
  setPaused: (paused: boolean) => void;
  restart: () => void;
  interact: () => void;
  continueLevel: () => void;
  setTouchControl: (control: TouchControl, active: boolean) => void;
  destroy: () => void;
};

export function createEscapeRouteGame(
  parent: HTMLElement,
  onHudUpdate: (snapshot: GameSnapshot) => void,
): EscapeRouteController {
  const scene = new EscapeRouteScene(onHudUpdate);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 620,
    backgroundColor: "#687263",
    transparent: false,
    antialias: true,
    roundPixels: true,
    powerPreference: "high-performance",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: true,
      mouse: false,
      touch: true,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    scene: [scene],
  });

  return {
    setPaused: (paused) => scene.setPaused(paused),
    restart: () => scene.restart(),
    interact: () => scene.interact(),
    continueLevel: () => scene.continueLevel(),
    setTouchControl: (control, active) =>
      scene.setTouchControl(control, active),
    destroy: () => game.destroy(true),
  };
}

export function createParkingGarageGame(
  parent: HTMLElement,
  onHudUpdate: (snapshot: ParkingGarageSnapshot) => void,
): EscapeRouteController {
  const scene = new ParkingGarageScene(onHudUpdate);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 620,
    backgroundColor: "#474a48",
    transparent: false,
    antialias: true,
    roundPixels: true,
    powerPreference: "high-performance",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: true,
      mouse: false,
      touch: true,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    scene: [scene],
  });

  return {
    setPaused: (paused) => scene.setPaused(paused),
    restart: () => scene.restart(),
    interact: () => scene.interact(),
    continueLevel: () => scene.continueLevel(),
    setTouchControl: (control, active) =>
      scene.setTouchControl(control, active),
    destroy: () => game.destroy(true),
  };
}

export function createMountainPassGame(
  parent: HTMLElement,
  onHudUpdate: (snapshot: MountainPassSnapshot) => void,
): EscapeRouteController {
  const scene = new MountainPassScene(onHudUpdate);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 620,
    backgroundColor: "#485448",
    transparent: false,
    antialias: true,
    roundPixels: true,
    powerPreference: "high-performance",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: true,
      mouse: false,
      touch: true,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    scene: [scene],
  });

  return {
    setPaused: (paused) => scene.setPaused(paused),
    restart: () => scene.restart(),
    interact: () => scene.interact(),
    continueLevel: () => scene.continueLevel(),
    setTouchControl: (control, active) =>
      scene.setTouchControl(control, active),
    destroy: () => game.destroy(true),
  };
}
