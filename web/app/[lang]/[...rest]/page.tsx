import { notFound } from "next/navigation";

// Any unknown path under a locale renders the designed not-found page inside the site layout.
export default function CatchAll() {
  notFound();
}
