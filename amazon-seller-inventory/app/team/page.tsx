import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relDate } from "@/lib/format";
import { createInvite } from "@/app/actions";
import { Avatar, Chip, Field, Header, Panel, SaveButton, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await currentUser();
  const [members, invites, counts] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }),
    db.invite.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.auditLog.groupBy({ by: ["actorId"], _count: { _all: true } }),
  ]);
  const entryCount = new Map(counts.map((c) => [c.actorId, c._count._all]));

  return (
    <main>
      <Header
        title="Team"
        back="/"
        sub={`You + ${members.length - 1} · ${invites.length} invite${invites.length === 1 ? "" : "s"} pending`}
        user={user}
      />
      <Panel title="Members">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div className="flex items-center gap-2.5">
              <Avatar name={m.name} size={28} />
              <div>
                <p className="text-[0.8rem] font-bold">{m.name}</p>
                <p className="text-[0.66rem] text-muted">
                  {m.email} · {entryCount.get(m.id) ?? 0} entries
                </p>
              </div>
            </div>
            <Chip tone={m.role === "ADMIN" ? "mp" : "ok"}>{m.role === "ADMIN" ? "Owner" : "Staff"}</Chip>
          </div>
        ))}
      </Panel>

      {invites.length > 0 ? (
        <Panel title="Pending invites">
          {invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
              <div>
                <p className="text-[0.8rem] font-bold">{i.email}</p>
                <p className="text-[0.66rem] text-muted">
                  invited {relDate(i.createdAt).toLowerCase()} · share: /join/{i.token.slice(0, 8)}…
                </p>
              </div>
              <Chip tone="low">Invited</Chip>
            </div>
          ))}
        </Panel>
      ) : null}

      <form action={createInvite}>
        <Field label="Invite staff by email">
          <input name="email" type="email" required placeholder="name@gmail.com" className={inputCls} />
        </Field>
        <SaveButton>Send invite link</SaveButton>
      </form>
      <p className="mt-3 text-[0.66rem] text-muted">
        They tap the link and continue with the same Google email. No invite, no entry. (Link delivery
        goes live with Supabase auth; until then the token is shown above to share by hand.)
      </p>
    </main>
  );
}
