import type { Point } from "./world";

export type Vehicle = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  lateralSpeed: number;
};

export type DrivingControls = {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
};

export const VEHICLE_LENGTH = 76;
export const VEHICLE_WIDTH = 42;
const MAX_FORWARD_SPEED = 360;
const MAX_REVERSE_SPEED = 138;

export function createVehicle(x: number, y: number, angle: number): Vehicle {
  return { x, y, angle, speed: 0, lateralSpeed: 0 };
}

export function getVehicleCorners(vehicle: Vehicle): Point[] {
  const halfLength = VEHICLE_LENGTH / 2;
  const halfWidth = VEHICLE_WIDTH / 2;
  const forwardX = Math.cos(vehicle.angle);
  const forwardY = Math.sin(vehicle.angle);
  const sideX = -forwardY;
  const sideY = forwardX;

  return [
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ].map(({ x, y }) => ({
    x:
      vehicle.x +
      forwardX * halfLength * x +
      sideX * halfWidth * y,
    y:
      vehicle.y +
      forwardY * halfLength * x +
      sideY * halfWidth * y,
  }));
}

export function getVehicleCollisionPoints(vehicle: Vehicle): Point[] {
  const halfLength = VEHICLE_LENGTH / 2;
  const halfWidth = VEHICLE_WIDTH / 2;
  const forwardX = Math.cos(vehicle.angle);
  const forwardY = Math.sin(vehicle.angle);
  const sideX = -forwardY;
  const sideY = forwardX;
  const corners = getVehicleCorners(vehicle);

  return [
    ...corners,
    { x: vehicle.x, y: vehicle.y },
    {
      x: vehicle.x + forwardX * halfLength,
      y: vehicle.y + forwardY * halfLength,
    },
    {
      x: vehicle.x - forwardX * halfLength,
      y: vehicle.y - forwardY * halfLength,
    },
    {
      x: vehicle.x + sideX * halfWidth,
      y: vehicle.y + sideY * halfWidth,
    },
    {
      x: vehicle.x - sideX * halfWidth,
      y: vehicle.y - sideY * halfWidth,
    },
  ];
}

export function stepVehicle(
  vehicle: Vehicle,
  controls: DrivingControls,
  deltaSeconds: number,
  grip = 1,
) {
  const dt = Math.min(deltaSeconds, 0.04);
  const surfaceGrip = Math.max(0.35, Math.min(grip, 1));
  const throttle = controls.accelerate ? 1 : 0;
  const braking = controls.brake ? 1 : 0;

  if (throttle) {
    vehicle.speed += (vehicle.speed < 0 ? 430 : 245) * throttle * dt;
  }

  if (braking) {
    vehicle.speed +=
      vehicle.speed > 0
        ? -430 * braking * dt
        : -190 * braking * dt;
  }

  vehicle.speed *= Math.exp(-0.74 * dt);
  vehicle.speed = Math.max(
    -MAX_REVERSE_SPEED,
    Math.min(MAX_FORWARD_SPEED, vehicle.speed),
  );
  if (!throttle && !braking && Math.abs(vehicle.speed) < 2) {
    vehicle.speed = 0;
  }

  const steer = Number(controls.right) - Number(controls.left);
  const speedRatio = Math.min(Math.abs(vehicle.speed) / 210, 1);
  if (steer && speedRatio > 0.025) {
    const reverse = vehicle.speed < -2 ? -1 : 1;
    vehicle.angle += steer * (0.3 + (1 - speedRatio) * 1.05) * reverse * dt;
  }

  const lateralAcceleration =
    -vehicle.lateralSpeed * 4.8 * surfaceGrip +
    -steer * Math.min(Math.abs(vehicle.speed) * 0.12, 38) *
      (0.7 + surfaceGrip * 0.3);
  vehicle.lateralSpeed += lateralAcceleration * dt;
  vehicle.lateralSpeed *= Math.exp(-(1.1 + 1.1 * surfaceGrip) * dt);
  vehicle.lateralSpeed = Math.max(-55, Math.min(55, vehicle.lateralSpeed));

  const forwardX = Math.cos(vehicle.angle);
  const forwardY = Math.sin(vehicle.angle);
  const sideX = -forwardY;
  const sideY = forwardX;
  vehicle.x += (forwardX * vehicle.speed + sideX * vehicle.lateralSpeed) * dt;
  vehicle.y += (forwardY * vehicle.speed + sideY * vehicle.lateralSpeed) * dt;
}
