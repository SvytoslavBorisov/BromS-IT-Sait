import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/auth?tab=register");
}