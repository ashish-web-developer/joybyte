import type { Point } from "./world";
import {
  TERMINAL_POINT,
  TERMINAL_RADIUS,
  TICKET_POINT,
  TICKET_RADIUS,
} from "./parking-garage-world";

export class ParkingTicket {
  private collected = false;

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - TICKET_POINT.x, point.y - TICKET_POINT.y) <=
      TICKET_RADIUS
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

export class PaymentTerminal {
  private activated = false;

  isNearby(point: Point) {
    return (
      Math.hypot(point.x - TERMINAL_POINT.x, point.y - TERMINAL_POINT.y) <=
      TERMINAL_RADIUS
    );
  }

  activate(point: Point, hasTicket: boolean) {
    if (this.activated || !hasTicket || !this.isNearby(point)) return false;
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
