"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function logoutAction() {
  const session = await getSession();
  await logAudit({ userId: session?.sub, action: "auth.logout" });
  await destroySession();
  redirect("/login");
}
