import { cookies } from "next/headers";
import { db } from "./db";

// DEV AUTH — a cookie picks which seeded user is acting, so every screen and
// every attribution path can be tested as Owner or Staff today. This module
// is the single seam where Supabase Google OAuth lands: `currentUser` will
// resolve the Supabase session instead of the cookie, and nothing else in
// the app changes.
export async function currentUser() {
  const store = await cookies();
  const id = store.get("acting-user")?.value;
  if (id) {
    const user = await db.user.findUnique({ where: { id } });
    if (user?.isActive) return user;
  }
  const owner = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("No users seeded — run: node prisma/seed.mjs");
  return owner;
}
