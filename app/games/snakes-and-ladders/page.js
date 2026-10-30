import Game from "./game";
import "./game.css";

export const metadata = {
  title: "Snakes & Ladders — One roll from the top",
  description:
    "Climb the ladders, dodge the snakes, and race Clover to square 100 in a bright, browser-based board game.",
};

export default function SnakesAndLaddersPage() {
  return <Game />;
}
