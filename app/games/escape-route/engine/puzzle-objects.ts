import type { BarrierConfig, Point, PuzzleSwitchConfig } from "./world";

export class PuzzleSwitch {
  private activated = false;

  constructor(private readonly config: PuzzleSwitchConfig) {}

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - this.config.x, point.y - this.config.y) <=
      this.config.interactionRadius
    );
  }

  activate(point: Point) {
    if (this.activated || !this.isNearby(point)) return false;
    this.activated = true;
    return true;
  }

  get isActivated() {
    return this.activated;
  }

  reset() {
    this.activated = false;
  }
}

export class RoadBarrier {
  private opened = false;

  constructor(private readonly config: BarrierConfig) {}

  blocks(point: Point) {
    if (this.opened) return false;

    const dx = point.x - this.config.x;
    const dy = point.y - this.config.y;
    const cosine = Math.cos(this.config.angle);
    const sine = Math.sin(this.config.angle);
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;

    return (
      Math.abs(localX) <= this.config.width / 2 + 5 &&
      Math.abs(localY) <= this.config.height / 2 + 5
    );
  }

  open() {
    this.opened = true;
  }

  get isOpen() {
    return this.opened;
  }

  reset() {
    this.opened = false;
  }
}
