import Link from "next/link";
import { IconBell } from "./icons";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-forest font-extrabold text-lime"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}

export function Chip({
  tone,
  children,
}: {
  tone: "ok" | "low" | "out" | "mp";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "bg-ok-wash text-ok",
    low: "bg-warn-wash text-warn",
    out: "bg-crit-wash text-crit",
    mp: "bg-lime-wash text-lime-ink",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Panel({ title, action, children }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-card p-3">
      {title ? (
        <h3 className="mb-1.5 flex items-center justify-between text-[0.74rem] font-extrabold">
          {title}
          {action}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function Header({
  title,
  sub,
  back,
  user,
  bell,
}: {
  title: string;
  sub?: React.ReactNode;
  back?: string;
  user: { name: string };
  bell?: number;
}) {
  return (
    <header className="flex items-center justify-between px-0.5 pb-3 pt-2">
      <div className="flex items-center gap-2.5">
        {back ? (
          <Link
            href={back}
            className="pressable flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line bg-card text-sm font-extrabold"
          >
            ‹
          </Link>
        ) : null}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
          {sub ? <p className="text-[0.7rem] font-semibold text-muted">{sub}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bell !== undefined ? (
          <Link href="/activity" className="pressable relative flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card">
            <IconBell className="h-4 w-4" />
            {bell > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[0.58rem] font-extrabold text-[#1e3b2c]">
                {bell}
              </span>
            ) : null}
          </Link>
        ) : null}
        <Link href="/login" className="pressable">
          <Avatar name={user.name} />
        </Link>
      </div>
    </header>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2.5 block">
      <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2.5 text-[0.9rem] font-bold outline-none focus:border-lime-deep";

export function SaveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="pressable mt-1 w-full rounded-xl bg-forest py-3 text-center font-heading text-[0.95rem] font-extrabold text-forest-ink shadow-lg shadow-forest/25"
    >
      {children}
    </button>
  );
}
