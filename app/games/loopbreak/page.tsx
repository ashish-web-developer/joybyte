import type { Metadata } from "next";
import Loopbreak from "./loopbreak";
import "./loopbreak.css";

export const metadata: Metadata = {
  title: "Loopbreak — Trace the current",
  description:
    "Rotate neon circuit tiles, collect every signal node, and find your way out in Loopbreak.",
};

export default function LoopbreakPage() {
  return <Loopbreak />;
}
