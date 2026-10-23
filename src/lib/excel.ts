import * as XLSX from "xlsx";
import type { Tx } from "./types";


export const norm = (v: any) => String(v ?? "").trim();

export const num = (v: any): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const cleaned = String(v)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// Resilient Date parsing (Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD, etc.)
export const dateStr = (v: any): string => {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d && d.y) {
        return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      }
    } catch {
      // ignore
    }
  }

  const s = String(v).trim();
  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY (Indonesian standard)
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // Match DD/MM/YY or DD-MM-YY
  const dmyShort = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (dmyShort) {
    const year = 2000 + Number(dmyShort[3]);
    return `${year}-${dmyShort[2].padStart(2, "0")}-${dmyShort[1].padStart(2, "0")}`;
  }

  const d = new Date(s);
  return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
};

// Fuzzy column lookup to accommodate workbook variations
export function getField(row: Record<string, any>, ...aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    const foundKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanAlias
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") {
      return row[foundKey];
    }
  }
  return "";
}

// Parse Excel sheet with fuzzy column matching
export function parseSheet(book: XLSX.WorkBook, targetSheetPattern: string): Tx[] {
  const sheetName =
    book.SheetNames.find(
      (name) => name.trim().toUpperCase() === targetSheetPattern.toUpperCase()
    ) ||
    book.SheetNames.find((name) =>
      name.toUpperCase().includes(
        targetSheetPattern.includes("MANADO") ? "MANADO" : "KASTIP"
      )
    );

  if (!sheetName) return [];
  const ws = book.Sheets[sheetName];
  if (!ws) return [];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  const isKastip = targetSheetPattern.toUpperCase().includes("KASTIP");
  const officialSource = isKastip ? "SETBAY KASTIP" : "SETBAY MANADO";

  return rawRows
    .map((r) => {
      const rawDate = getField(
        r,
        "COTC_TRAN_DATE",
        "TRAN_DATE",
        "TRAN_TRANSACTION_DATE",
        "TANGGAL",
        "DATE"
      );
      const parsedDate = dateStr(rawDate);

      const transaction_type = norm(
        getField(r, "TRANSACTION_TYPE", "TRAN_TYPE", "JENIS_TRANSAKSI", "TYPE")
      );
      const money_type = norm(
        getField(r, "MONEY_TYPE", "JENIS_UANG", "KAT_UANG")
      );
      const bank_name = norm(
        getField(r, "BANK_NAME", "NAMA_BANK", "BANK")
      );

      const branch_name = isKastip
        ? norm(getField(r, "Nama Kastip", "NAMA_KASTIP", "KASTIP", "CABANG", "LOKASI")) || "Kastip"
        : "Manado";

      const denom = norm(
        getField(r, "Denom", "DENOM", "DENOMINASI", "PECAHAN")
      );

      const pieces = isKastip
        ? num(getField(r, "COTCR_PIECES", "COTCP_PIECES", "PIECES", "LEMBAR"))
        : num(getField(r, "COTCP_PIECES", "COTCR_PIECES", "PIECES", "LEMBAR"));

      const amount = isKastip
        ? num(getField(r, "COTCR_AMOUNT", "COTCP_AMOUNT", "AMOUNT", "NOMINAL", "NILAI"))
        : num(getField(r, "COTCP_AMOUNT", "COTCR_AMOUNT", "AMOUNT", "NOMINAL", "NILAI"));

      const inflow = isKastip
        ? num(getField(r, "Inflow Kastip", "Inflow", "INFLOW", "ARUS_MASUK"))
        : num(getField(r, "Inflow", "INFLOW", "ARUS_MASUK"));

      const outflow = isKastip
        ? num(getField(r, "Outflow Kastip", "Outflow Kasti", "Outflow", "OUTFLOW", "ARUS_KELUAR"))
        : num(getField(r, "Outflow", "OUTFLOW", "ARUS_KELUAR"));

      const netflow = isKastip
        ? num(getField(r, "Netflow Kastip", "Netflow", "Neflow", "NETFLOW"))
        : num(getField(r, "Netflow", "Neflow", "NETFLOW"));

      return {
        source: officialSource,
        transaction_date: parsedDate,
        transaction_type,
        money_type,
        bank_name,
        branch_name,
        denom,
        pieces,
        amount,
        inflow,
        outflow,
        netflow,
      };
    })
    .filter((r) => r.transaction_date && /^\d{4}-\d{2}-\d{2}$/.test(r.transaction_date));
}
