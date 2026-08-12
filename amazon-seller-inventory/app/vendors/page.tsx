import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { inr, relTime } from "@/lib/format";
import { vendorBalances } from "@/lib/queries";
import { Header } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const user = await currentUser();
  const vendors = await vendorBalances();
  const totalDue = vendors.reduce((s, v) => s + Math.max(0, v.due), 0);

  return (
    <main>
      <Header title="Vendors" back="/" sub={<span className="num">{inr(totalDue)} to pay overall</span>} user={user} />
      {vendors.map((v) => (
        <Link
          key={v.id}
          href={`/vendors/${v.id}`}
          className="pressable mb-2.5 flex items-center justify-between rounded-2xl border border-line bg-card p-3"
        >
          <div>
            <p className="text-[0.84rem] font-bold">{v.name}</p>
            <p className="text-[0.66rem] text-muted">
              bought {inr(v.bought)} ·{" "}
              {v.lastPayment ? `last paid ${relTime(v.lastPayment.paidAt)}` : "never paid"}
            </p>
          </div>
          {v.due > 0.005 ? (
            <p className="num text-[0.88rem] font-extrabold text-warn">{inr(v.due)}</p>
          ) : (
            <p className="text-[0.7rem] font-extrabold text-ok">Settled</p>
          )}
        </Link>
      ))}
    </main>
  );
}
