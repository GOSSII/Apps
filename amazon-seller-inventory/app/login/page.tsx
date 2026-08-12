import { db } from "@/lib/db";
import { actAs } from "@/app/actions";
import { Avatar, Chip } from "@/components/ui";
import { IconBox } from "@/components/icons";

export const dynamic = "force-dynamic";

// DEV sign-in: until the Supabase project exists, "Continue with Google" is
// stood in for by picking a seeded user. The layout matches the approved
// sign-in screen so the swap is invisible.
export default async function LoginPage() {
  const users = await db.user.findMany({ where: { isActive: true }, orderBy: { role: "asc" } });
  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-lime shadow-lg shadow-forest/30">
        <IconBox className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">StockBook</h1>
      <p className="mt-1 text-[0.8rem] text-muted">One stock book for everywhere you sell.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <Chip tone="mp">Amazon</Chip>
        <Chip tone="mp">Flipkart</Chip>
        <Chip tone="mp">Meesho</Chip>
        <Chip tone="mp">+ more</Chip>
      </div>

      <div className="mt-8 w-full max-w-xs">
        <p className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-wider text-muted">
          Dev sign-in · Google OAuth arrives with Supabase
        </p>
        {users.map((u) => (
          <form key={u.id} action={actAs}>
            <input type="hidden" name="userId" value={u.id} />
            <button
              type="submit"
              className="pressable mb-2 flex w-full items-center gap-3 rounded-full border border-line bg-card px-4 py-2.5 text-left"
            >
              <Avatar name={u.name} size={28} />
              <span className="flex-1 text-[0.86rem] font-extrabold">Continue as {u.name}</span>
              <Chip tone={u.role === "ADMIN" ? "mp" : "ok"}>{u.role === "ADMIN" ? "Owner" : "Staff"}</Chip>
            </button>
          </form>
        ))}
      </div>
      <p className="mt-6 max-w-[30ch] text-[0.66rem] text-muted">
        In production: staff join by invite — the owner sends a link, you tap it and continue with the
        same Google email. No invite, no entry.
      </p>
    </main>
  );
}
