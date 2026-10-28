import type { Metadata } from "next";
import SnackSwipe from "./snack-swipe";

export const metadata: Metadata = {
  title: "Snack Attack — Snack Swipe",
  description:
    "Catch tasty snacks, dodge bombs, build combos, and chase your high score.",
};

export default function SnackAttackPage() {
  return <SnackSwipe />;
}
