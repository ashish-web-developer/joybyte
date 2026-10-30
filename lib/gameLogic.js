import { BOARD_SIZE, LADDERS, SNAKES } from "./gameConfig";

export function rollDie(random = Math.random) {
  return Math.floor(random() * 6) + 1;
}

export function resolveLanding(square) {
  const ladder = LADDERS.find(({ bottom }) => bottom === square);
  if (ladder) return { destination: ladder.top, type: "ladder" };

  const snake = SNAKES.find(({ head }) => head === square);
  if (snake) return { destination: snake.tail, type: "snake" };

  return { destination: square, type: null };
}

export function getMoveResult(position, roll) {
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position > BOARD_SIZE ||
    !Number.isInteger(roll) ||
    roll < 1 ||
    roll > 6
  ) {
    throw new RangeError("A move needs a position from 0 to 100 and a die roll from 1 to 6.");
  }

  const candidate = position + roll;
  if (candidate > BOARD_SIZE) {
    return { position, landedOn: position, effect: null, exactFinishRequired: true };
  }

  const landing = resolveLanding(candidate);
  return {
    position: landing.destination,
    landedOn: candidate,
    effect: landing.type,
    exactFinishRequired: false,
  };
}
