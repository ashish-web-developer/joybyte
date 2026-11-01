import type { Point } from "./world";
import type { MountainMarker } from "./mountain-pass-world";

export class MountainPowerSwitch {
  private activated = false;

  constructor(private readonly config: MountainMarker) {}

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - this.config.x, point.y - this.config.y) <=
      this.config.radius
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

export class BridgeRepair {
  private repairing = false;
  private repaired = false;

  constructor(private readonly panel: MountainMarker) {}

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - this.panel.x, point.y - this.panel.y) <=
      this.panel.radius
    );
  }

  begin(point: Point, powerA: boolean, powerB: boolean) {
    if (
      !this.isNearby(point) ||
      !powerA ||
      !powerB ||
      this.repairing ||
      this.repaired
    ) {
      return false;
    }
    this.repairing = true;
    return true;
  }

  complete() {
    if (!this.repairing || this.repaired) return false;
    this.repairing = false;
    this.repaired = true;
    return true;
  }

  get isRepairing() {
    return this.repairing;
  }

  get isRepaired() {
    return this.repaired;
  }

  reset() {
    this.repairing = false;
    this.repaired = false;
  }
}

export class HiddenCache {
  private collected = false;

  constructor(private readonly marker: MountainMarker) {}

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - this.marker.x, point.y - this.marker.y) <=
      this.marker.radius
    );
  }

  collect(point: Point) {
    if (this.collected || !this.isNearby(point)) return false;
    this.collected = true;
    return true;
  }

  get isCollected() {
    return this.collected;
  }

  reset() {
    this.collected = false;
  }
}
