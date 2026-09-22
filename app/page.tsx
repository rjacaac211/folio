import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function HomePage() {
  redirect((await getCurrentUser()) ? "/documents" : "/login");
}
