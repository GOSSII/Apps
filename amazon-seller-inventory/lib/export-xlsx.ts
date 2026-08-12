import ExcelJS from "exceljs";
import type { Report } from "./reports";

// Real .xlsx with typed number columns — totals stay summable in a
// spreadsheet, which is the whole point of giving the accountant Excel
// instead of a PDF.
export async function reportToXlsx(report: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "StockBook";
  const ws = wb.addWorksheet(report.title.slice(0, 31));

  ws.addRow([report.title]).font = { bold: true, size: 14 };
  ws.addRow([report.subtitle]).font = { size: 10, color: { argb: "FF75817A" } };
  ws.addRow([]);

  const header = ws.addRow(report.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3B2C" } };
  });

  for (const row of report.rows) {
    const r = ws.addRow(report.columns.map((c) => row[c.key] ?? ""));
    report.columns.forEach((c, i) => {
      if (c.type === "num") r.getCell(i + 1).numFmt = "#,##0.00";
      if (c.type === "int") r.getCell(i + 1).numFmt = "#,##0";
    });
  }

  if (report.totals) {
    const t = ws.addRow(report.columns.map((c) => report.totals![c.key] ?? ""));
    t.font = { bold: true };
    t.eachCell((cell) => {
      cell.border = { top: { style: "double" } };
    });
    report.columns.forEach((c, i) => {
      if (c.type === "num") t.getCell(i + 1).numFmt = "#,##0.00";
      if (c.type === "int") t.getCell(i + 1).numFmt = "#,##0";
    });
    if (typeof report.totals._balance === "number") {
      const b = ws.addRow([]);
      b.getCell(report.columns.length - 1).value = "Balance due";
      b.getCell(report.columns.length).value = report.totals._balance;
      b.getCell(report.columns.length).numFmt = "#,##0.00";
      b.font = { bold: true, color: { argb: "FFB45309" } };
    }
  }

  report.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width ?? 14;
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
