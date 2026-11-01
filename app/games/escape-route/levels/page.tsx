import type { Metadata } from "next";
import LevelSelect from "../level-select";
import "../escape-route.css";

export const metadata: Metadata = {
  title: "ESCAPE ROUTE — Level Select",
  description: "Choose an unlocked ESCAPE ROUTE driving mission.",
};

export default function LevelSelectPage() {
  return <LevelSelect />;
}
