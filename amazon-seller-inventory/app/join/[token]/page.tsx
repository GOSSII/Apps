import { db } from "@/lib/db";
import { acceptInvite } from "@/app/actions";
import { Chip } from "@/components/ui";
import { IconBox } from "@/components/icons";

export const dynamic = "force-dynamic";

// The staff side of the invite door. In production this is "Continue with
// Google" and the signed-in email must match the invite; in dev the invitee
// types their name and enters as that email.
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { invitedBy: true } });

  if (!invite || invite.status !== "PENDING") {
    return (
      <main className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-extrabold">This invite isn't valid</h1>
        <p className="mt-2 max-w-[32ch] text-sm text-muted">
          {invite?.status === "ACCEPTED"
            ? "It was already used. If that wasn't you, ask the owner to send a fresh one."
            : "The link may be old or revoked. Ask the owner for a new invite."}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-lime shadow-lg shadow-forest/30">
        <IconBox className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">You're invited</h1>
      <p className="mt-1 text-[0.85rem] text-muted">
        {invite.invitedBy.name} invited <b className="text-ink">{invite.email}</b> to StockBook
      </p>
      <div className="mt-2"><Chip tone="ok">Staff access · Stock, Products, Purchases</Chip></div>

      <form action={acceptInvite} className="mt-7 w-full max-w-xs">
        <input type="hidden" name="token" value={invite.token} />
        <input
          name="name"
          required
          placeholder="Your name"
          className="mb-2 w-full rounded-full border border-line bg-card px-4 py-2.5 text-center text-[0.9rem] font-bold outline-none focus:border-lime-deep"
        />
        <button
          type="submit"
          className="pressable w-full rounded-full bg-forest py-3 font-heading text-[0.92rem] font-extrabold text-forest-ink shadow-lg shadow-forest/25"
        >
          Accept & continue <span className="text-lime">(as {invite.email})</span>
        </button>
      </form>
      <p className="mt-5 max-w-[32ch] text-[0.66rem] text-muted">
        In production this button is "Continue with Google" — and the Google email must be exactly the
        invited one.
      </p>
    </main>
  );
}
