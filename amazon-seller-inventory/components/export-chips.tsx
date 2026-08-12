// PDF / XLS download chips — used on every report screen.
export function ExportChips({ base }: { base: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <span className="inline-flex gap-1">
      {(["pdf", "xlsx"] as const).map((f) => (
        <a
          key={f}
          href={`${base}${sep}format=${f}`}
          download
          className="pressable rounded-md border border-line px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-wide text-muted"
        >
          {f === "xlsx" ? "XLS" : "PDF"}
        </a>
      ))}
    </span>
  );
}
