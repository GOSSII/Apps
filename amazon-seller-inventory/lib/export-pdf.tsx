import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "./reports";

// Noto Sans is vendored so the rupee sign renders — Helvetica has no ₹.
Font.register({
  family: "Noto",
  src: path.join(process.cwd(), "assets", "NotoSans-Regular.ttf"),
});

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v: string | number | null | undefined, type?: string) => {
  if (v === null || v === undefined || v === "") return "";
  if (type === "num" && typeof v === "number") return inr.format(v);
  if (type === "int" && typeof v === "number") return v.toLocaleString("en-IN");
  return String(v);
};

const s = StyleSheet.create({
  page: { fontFamily: "Noto", fontSize: 8.5, padding: 32, color: "#14201a" },
  brandBar: { height: 5, backgroundColor: "#1e3b2c", marginBottom: 2 },
  limeBar: { height: 2, backgroundColor: "#b5e04c", marginBottom: 14 },
  brand: { fontSize: 9, color: "#75817a", marginBottom: 2 },
  title: { fontSize: 16, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#75817a", marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e7eae7", paddingVertical: 3.5 },
  head: { backgroundColor: "#1e3b2c", color: "#ffffff", borderBottomWidth: 0 },
  totals: { borderTopWidth: 1.5, borderTopColor: "#14201a", borderBottomWidth: 0 },
  balance: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, fontSize: 11 },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, fontSize: 7.5, color: "#75817a", textAlign: "center" },
  cell: { paddingHorizontal: 3 },
});

function ReportDoc({ report, exportedBy }: { report: Report; exportedBy: string }) {
  const widths = report.columns.map((c) => c.width ?? 14);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const pct = (i: number) => `${(widths[i] / totalW) * 100}%`;
  const align = (t?: string) => (t === "num" || t === "int" ? ("right" as const) : ("left" as const));

  return (
    <Document title={report.title} author="StockBook">
      <Page size="A4" style={s.page}>
        <View style={s.brandBar} />
        <View style={s.limeBar} />
        <Text style={s.brand}>StockBook</Text>
        <Text style={s.title}>{report.title}</Text>
        <Text style={s.subtitle}>{report.subtitle}</Text>

        <View style={[s.row, s.head]} fixed>
          {report.columns.map((c, i) => (
            <Text key={c.key} style={[s.cell, { width: pct(i), textAlign: align(c.type) }]}>{c.label}</Text>
          ))}
        </View>
        {report.rows.map((row, ri) => (
          <View key={ri} style={s.row} wrap={false}>
            {report.columns.map((c, i) => (
              <Text key={c.key} style={[s.cell, { width: pct(i), textAlign: align(c.type) }]}>
                {fmt(row[c.key], c.type)}
              </Text>
            ))}
          </View>
        ))}
        {report.totals ? (
          <View style={[s.row, s.totals]}>
            {report.columns.map((c, i) => (
              <Text key={c.key} style={[s.cell, { width: pct(i), textAlign: align(c.type) }]}>
                {fmt(report.totals![c.key], c.type)}
              </Text>
            ))}
          </View>
        ) : null}
        {report.totals && typeof report.totals._balance === "number" ? (
          <View style={s.balance}>
            <Text>Balance due:  ₹{inr.format(report.totals._balance)}</Text>
          </View>
        ) : null}

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Exported by ${exportedBy} · ${new Date().toLocaleString("en-IN")} · page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function reportToPdf(report: Report, exportedBy: string): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ReportDoc report={report} exportedBy={exportedBy} />));
}
