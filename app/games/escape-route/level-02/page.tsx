import type { Metadata } from "next";
import ParkingGarage from "../parking-garage";
import "../escape-route.css";

export const metadata: Metadata = {
  title: "ESCAPE ROUTE — Underground Parking",
  description:
    "Find a parking ticket, pay at the garage terminal, and navigate the underground aisles to the street exit.",
};

export default function ParkingGaragePage() {
  return <ParkingGarage />;
}
