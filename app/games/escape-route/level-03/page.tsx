import type { Metadata } from "next";
import MountainPass from "../mountain-pass";
import "../escape-route.css";

export const metadata: Metadata = {
  title: "ESCAPE ROUTE — The Last Summit",
  description:
    "Restore two mountain power stations, repair the broken bridge, and reach the summit relay in The Last Summit.",
};

export default function TheLastSummitPage() {
  return <MountainPass />;
}
