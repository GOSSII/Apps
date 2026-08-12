import { NextRequest } from "next/server";
import { db, setActor } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { activityReport, purchaseRegister, stockReport, vendorStatement, type Report } from "@/lib/reports";
import { reportToXlsx } from "@/lib/export-xlsx";
import { reportToPdf } from "@/lib/export-pdf";

export const dynamic = "force-dynamic";

// GET /exports/stock?format=xlsx|pdf
// GET /exports/purchases?format=…
// GET /exports/activity?format=…
// GET /exports/vendor?id=…&format=…
export async function GET(req: NextRequest, ctx: { params: Promise<{ report: string }> }) {
  const { report: kind } = await ctx.params;
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const user = await currentUser();
  setActor(user.id);

  let report: Report | null = null;
  if (kind === "stock") report = await stockReport();
  else if (kind === "purchases") report = await purchaseRegister();
  else if (kind === "activity") report = await activityReport();
  else if (kind === "vendor") {
    const id = req.nextUrl.searchParams.get("id");
    report = id ? await vendorStatement(id) : null;
  }
  if (!report) return new Response("Unknown report", { status: 404 });

  // Exports are attributed and logged like every other action.
  await db.auditLog.create({
    data: { actorId: user.id, action: "EXPORT", entity: report.title, entityId: format },
  });

  const filename = `stockbook-${report.slug}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const body = format === "pdf" ? await reportToPdf(report, user.name) : await reportToXlsx(report);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
