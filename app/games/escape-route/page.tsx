import type { Metadata } from "next";
import EscapeRoute from "./escape-route";
import "./escape-route.css";

export const metadata: Metadata = {
  title: "ESCAPE ROUTE — City Intersection",
  description:
    "Find the street switch, open the gate, and reach the studio in City Intersection, the first ESCAPE ROUTE puzzle level.",
};

export default function EscapeRoutePage() {
  return <EscapeRoute />;
}
