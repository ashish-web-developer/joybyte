import { permanentRedirect } from "next/navigation";

export default function EscapeRoutePage() {
  permanentRedirect("/games/escape-route/level-01");
}
