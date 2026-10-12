import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathFor, toRole } from "@/lib/roles";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(homePathFor(toRole(session.user.role)));
}
