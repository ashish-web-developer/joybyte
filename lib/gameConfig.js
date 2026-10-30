export const PLAYER_IDS = {
  HUMAN: "human",
  COMPUTER: "computer",
};

export const BOARD_SIZE = 100;

export const SNAKES = [
  { head: 98, tail: 2, dramatic: true },
  { head: 95, tail: 75 },
  { head: 92, tail: 71 },
  { head: 83, tail: 62 },
  { head: 67, tail: 45 },
  { head: 58, tail: 39 },
  { head: 47, tail: 19 },
  { head: 34, tail: 12 },
  { head: 27, tail: 4 },
];

export const LADDERS = [
  { bottom: 3, top: 22 },
  { bottom: 8, top: 30 },
  { bottom: 20, top: 41 },
  { bottom: 28, top: 55 },
  { bottom: 36, top: 57 },
  { bottom: 51, top: 72 },
  { bottom: 71, top: 91 },
  { bottom: 80, top: 99 },
];

export const PLAYER_DETAILS = {
  [PLAYER_IDS.HUMAN]: {
    name: "You",
    subtitle: "The trailblazer",
    color: "#f27648",
    softColor: "#fff0e8",
    icon: "human",
  },
  [PLAYER_IDS.COMPUTER]: {
    name: "Clover",
    subtitle: "Computer",
    color: "#8171d8",
    softColor: "#f0edff",
    icon: "computer",
  },
};
