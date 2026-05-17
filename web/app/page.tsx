// Redirect the root URL to the dashboard

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
