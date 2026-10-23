"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import Link from "next/link";

import { supabase, configured } from "@/lib/supabase";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LayoutDashboard,
  FileSpreadsheet,
  ChartNoAxesCombined,
  Info,
  Upload,
  LogIn,
  LogOut,
  RefreshCw,
  Download,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Banknote,
  Building2,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Tx } from "@/lib/types";
import { parseSheet } from "@/lib/excel";

const CHART_COLORS = [
  "#1d4ed8", // deep royal blue
  "#059669", // emerald green
  "#d97706", // amber
  "#7c3aed", // purple
  "#e11d48", // rose
  "#0891b2", // cyan
  "#475569", // slate
  "#ea580c", // orange
  "#0284c7", // light blue
  "#16a34a", // green
];

const MONTH_NAMES: Record<string, string> = {
  "01": "Januari",
  "02": "Februari",
  "03": "Maret",
  "04": "April",
  "05": "Mei",
  "06": "Juni",
  "07": "Juli",
  "08": "Agustus",
  "09": "September",
  "10": "Oktober",
  "11": "November",
  "12": "Desember",
};

// Formatting helpers
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n || 0);

const rup = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n || 0);

const compact = (n: number) => {
  const a = Math.abs(n || 0);
  if (a >= 1e12) return (n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " T";
  if (a >= 1e9) return (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M";
  if (a >= 1e6) return (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " Jt";
  return fmt(n);
};

// Group helper
function group(rows: Tx[], key: keyof Tx) {
  const m = new Map<
    string,
    {
      name: string;
      count: number;
      amount: number;
      inflow: number;
      outflow: number;
      netflow: number;
      pieces: number;
    }
  >();

  rows.forEach((r) => {
    const name = String(r[key] || "(Tidak Diketahui)");
    if (!m.has(name)) {
      m.set(name, {
        name,
        count: 0,
        amount: 0,
        inflow: 0,
        outflow: 0,
        netflow: 0,
        pieces: 0,
      });
    }
    const a = m.get(name)!;
    a.count++;
    a.amount += r.amount;
    a.inflow += r.inflow;
    a.outflow += r.outflow;
    a.netflow += r.netflow;
    a.pieces += r.pieces;
  });

  return Array.from(m.values()).sort((a, b) => b.amount - a.amount);
}


export default function Home() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  // Authentication
  const [session, setSession] = useState<any>(null);

  // Navigation
  const [page, setPage] = useState<"overview" | "transactions" | "breakdown" | "about">("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [source, setSource] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [money, setMoney] = useState("all");
  const [bank, setBank] = useState("all");
  const [denom, setDenom] = useState("all");
  const [query, setQuery] = useState("");

  // Table pagination & sorting
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<keyof Tx>("transaction_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch all transactions handling PostgREST 1000-row limit pagination
  async function loadData() {
    if (!configured) {
      setMsg({
        type: "error",
        text: "Supabase belum dikonfigurasi. Silakan isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local atau Vercel.",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let allRecords: Tx[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("setbay_transactions")
          .select("id,source,transaction_date,transaction_type,money_type,bank_name,branch_name,denom,pieces,amount,inflow,outflow,netflow")
          .order("transaction_date", { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRecords = allRecords.concat(data as Tx[]);
        if (data.length < step) break;
        from += step;
      }

      setRows(allRecords);
      if (allRecords.length > 0) {
        setMsg({
          type: "success",
          text: `Berhasil terhubung ke Supabase · ${fmt(allRecords.length)} baris transaksi aktif dibaca.`,
        });
      } else {
        setMsg({
          type: "info",
          text: "Database terhubung namun belum ada data transaksi. Login administrator dan impor workbook Excel SETBAY.",
        });
      }
    } catch (err: any) {
      setMsg({
        type: "error",
        text: "Gagal membaca database: " + (err.message || String(err)),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (configured) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));

      loadData();
      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  // Filtered dataset
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (source !== "all" && r.source !== source) return false;
      if (year !== "all" && r.transaction_date.slice(0, 4) !== year) return false;
      if (month !== "all" && r.transaction_date.slice(5, 7) !== month) return false;
      if (branch !== "all" && r.branch_name !== branch) return false;
      if (type !== "all" && r.transaction_type !== type) return false;
      if (money !== "all" && r.money_type !== money) return false;
      if (bank !== "all" && r.bank_name !== bank) return false;
      if (denom !== "all" && r.denom !== denom) return false;
      if (query) {
        const q = query.toLowerCase();
        const searchable = [
          r.transaction_date,
          r.source,
          r.transaction_type,
          r.money_type,
          r.bank_name,
          r.branch_name,
          r.denom,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [rows, source, year, month, branch, type, money, bank, denom, query]);

  // Dynamic filter options based on all rows
  const availableYears = useMemo(
    () => [...new Set(rows.map((r) => r.transaction_date.slice(0, 4)))].sort().reverse(),
    [rows]
  );
  const availableBranches = useMemo(
    () => [...new Set(rows.map((r) => r.branch_name).filter(Boolean))].sort(),
    [rows]
  );
  const availableTypes = useMemo(
    () => [...new Set(rows.map((r) => r.transaction_type).filter(Boolean))].sort(),
    [rows]
  );
  const availableMoneys = useMemo(
    () => [...new Set(rows.map((r) => r.money_type).filter(Boolean))].sort(),
    [rows]
  );
  const availableBanks = useMemo(
    () => [...new Set(rows.map((r) => r.bank_name).filter(Boolean))].sort(),
    [rows]
  );
  const availableDenoms = useMemo(
    () => [...new Set(rows.map((r) => r.denom).filter(Boolean))].sort(),
    [rows]
  );

  // Aggregated KPI numbers
  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const totalInflow = useMemo(() => filtered.reduce((s, r) => s + r.inflow, 0), [filtered]);
  const totalOutflow = useMemo(() => filtered.reduce((s, r) => s + Math.abs(r.outflow), 0), [filtered]);
  const totalNetflow = useMemo(() => filtered.reduce((s, r) => s + r.netflow, 0), [filtered]);
  const totalPieces = useMemo(() => filtered.reduce((s, r) => s + r.pieces, 0), [filtered]);

  // Trend Chart Data (Annual or Monthly)
  const trendData = useMemo(() => {
    if (year !== "all") {
      // Monthly breakdown for selected year
      const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
      return months.map((m) => {
        const monthRows = filtered.filter((r) => r.transaction_date.slice(5, 7) === m);
        return {
          label: MONTH_NAMES[m].slice(0, 3),
          inflow: monthRows.reduce((s, r) => s + r.inflow, 0),
          outflow: monthRows.reduce((s, r) => s + Math.abs(r.outflow), 0),
          netflow: monthRows.reduce((s, r) => s + r.netflow, 0),
          amount: monthRows.reduce((s, r) => s + r.amount, 0),
        };
      });
    }

    // Annual breakdown
    const years = [...new Set(filtered.map((r) => r.transaction_date.slice(0, 4)))].sort();
    return years.map((y) => {
      const yearRows = filtered.filter((r) => r.transaction_date.startsWith(y));
      return {
        label: y,
        inflow: yearRows.reduce((s, r) => s + r.inflow, 0),
        outflow: yearRows.reduce((s, r) => s + Math.abs(r.outflow), 0),
        netflow: yearRows.reduce((s, r) => s + r.netflow, 0),
        amount: yearRows.reduce((s, r) => s + r.amount, 0),
      };
    });
  }, [filtered, year]);

  // Composition data for Pie chart
  const typesData = useMemo(() => {
    return group(filtered, "transaction_type").map((r, i) => ({
      name: r.name,
      value: r.count,
      amount: r.amount,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filtered]);

  // Top Banks Chart Data
  const topBanksData = useMemo(() => {
    return group(filtered, "bank_name")
      .slice(0, 8)
      .map((r) => ({
        name: r.name.length > 20 ? r.name.slice(0, 19) + "…" : r.name,
        fullName: r.name,
        nilai: r.amount,
        inflow: r.inflow,
        outflow: Math.abs(r.outflow),
      }));
  }, [filtered]);

  // Denomination Chart Data
  const denomData = useMemo(() => {
    return group(filtered, "denom")
      .slice(0, 10)
      .map((r) => ({
        name: r.name,
        nilai: r.amount,
        pieces: r.pieces,
      }));
  }, [filtered]);

  // Sorted & paginated rows
  const sortedRows = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];
      if (typeof va === "string") {
        return sortOrder === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortOrder === "asc" ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return list;
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const startIdx = (pageNo - 1) * pageSize;
    return sortedRows.slice(startIdx, startIdx + pageSize);
  }, [sortedRows, pageNo, pageSize]);

  // Handle Sort Toggle
  function toggleSort(field: keyof Tx) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  // Reset all filters
  function resetFilters() {
    setSource("all");
    setYear("all");
    setMonth("all");
    setBranch("all");
    setType("all");
    setMoney("all");
    setBank("all");
    setDenom("all");
    setQuery("");
    setPageNo(1);
  }

  // Auth: Sign Out
  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setMsg({ type: "info", text: "Sesi administrator telah berakhir." });
  }

  // Import Excel with progress and validation
  async function handleImportExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!session) {
      setMsg({ type: "error", text: "Akses admin diperlukan untuk mengimpor data." });
      e.target.value = "";
      return;
    }

    setBusy(true);
    setMsg({ type: "info", text: `Membaca file "${file.name}" dan memetakan transaksi...` });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

      const parsedManado = parseSheet(workbook, "SETBAY MANADO");
      const parsedKastip = parseSheet(workbook, "SETBAY KASTIP");
      const combined = [...parsedManado, ...parsedKastip];

      if (combined.length === 0) {
        throw new Error(
          "Tidak ditemukan transaksi bertanggal valid. Pastikan file berisi sheet 'SETBAY MANADO' atau 'SETBAY KASTIP' dengan kolom transaksi yang sesuai."
        );
      }

      const sources = [...new Set(combined.map((r) => r.source))];

      for (const s of sources) {
        setMsg({ type: "info", text: `Menghapus data lama untuk kategori ${s}...` });
        const { error: delError } = await supabase
          .from("setbay_transactions")
          .delete()
          .eq("source", s);
        if (delError) {
          throw new Error(`Gagal memperbarui data ${s}: ${delError.message}`);
        }
      }

      // Batch insert in chunks of 500
      const totalBatches = Math.ceil(combined.length / 500);
      for (let i = 0; i < combined.length; i += 500) {
        const batchIndex = Math.floor(i / 500) + 1;
        setMsg({
          type: "info",
          text: `Menyimpan ke Supabase (batch ${batchIndex} dari ${totalBatches})...`,
        });
        const chunk = combined.slice(i, i + 500);
        const { error: insertError } = await supabase.from("setbay_transactions").insert(chunk);
        if (insertError) {
          throw new Error(
            `Penyisipan terhenti pada batch ${batchIndex}: ${insertError.message}`
          );
        }
      }

      await loadData();
      setMsg({
        type: "success",
        text: `Impor berhasil: ${fmt(combined.length)} baris transaksi (${fmt(parsedManado.length)} Manado, ${fmt(parsedKastip.length)} Kastip) telah disimpan. Kolom nomor rekening bank dipastikan tidak tersimpan.`,
      });
    } catch (err: any) {
      setMsg({ type: "error", text: "Impor gagal: " + (err.message || String(err)) });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  // Delete all data (Admin only)
  async function handleDeleteAll() {
    if (!session) return;
    const ok = window.confirm(
      "Apakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi di Supabase? Tindakan ini tidak dapat dibatalkan."
    );
    if (!ok) return;

    setBusy(true);
    setMsg({ type: "info", text: "Menghapus semua data transaksi dari Supabase..." });
    try {
      const { error } = await supabase
        .from("setbay_transactions")
        .delete()
        .neq("id", 0);
      if (error) throw error;
      await loadData();
      setMsg({ type: "success", text: "Semua data transaksi berhasil dibersihkan." });
    } catch (err: any) {
      setMsg({ type: "error", text: "Gagal menghapus data: " + (err.message || String(err)) });
    } finally {
      setBusy(false);
    }
  }

  // Export filtered dataset to CSV
  function exportCsv() {
    if (!filtered.length) {
      alert("Tidak ada data untuk diekspor pada filter ini.");
      return;
    }
    const cols: (keyof Tx)[] = [
      "transaction_date",
      "source",
      "transaction_type",
      "bank_name",
      "branch_name",
      "money_type",
      "denom",
      "pieces",
      "amount",
      "inflow",
      "outflow",
      "netflow",
    ];

    const header = [
      "Tanggal",
      "Sumber",
      "Jenis Transaksi",
      "Bank",
      "Unit/Lokasi",
      "Jenis Uang",
      "Denominasi",
      "Lembar/Keping",
      "Nilai Transaksi (Rp)",
      "Inflow (Rp)",
      "Outflow (Rp)",
      "Netflow (Rp)",
    ];

    const rowsCsv = filtered.map((r) =>
      cols
        .map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const csvContent = "\ufeff" + [header.join(","), ...rowsCsv].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BI_SETBAY_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const pageTitles = {
    overview: ["Dashboard Analisis Eksekutif", "Visualisasi tren setoran, bayaran, arus kas uang kartal, dan performa perbankan."],
    transactions: ["Data Transaksi Riil", "Telusuri, sortir, dan saring setiap catatan transaksi yang tersimpan di Supabase."],
    breakdown: ["Analisis Rincian & Agregasi", "Komparasi multidimensi per bank, denominasi pecahan, unit kerja, dan jenis uang."],
    about: ["Tentang Sistem & Metodologi", "Kepatuhan privasi kerahasiaan perbankan, struktur data, dan panduan operasional."],
  };

  return (
    <div className="shell">
      {/* Mobile Header Toggle */}
      <div className="mobile-header">
        <button
          className="icon-btn"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="brand-mobile">
          <div className="brandmark">BI</div>
          <b>BI SETBAY</b>
        </div>
        <div className="status-dot-wrap">
          <span className={`status-dot ${configured ? "ok" : "warn"}`} />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brandmark">BI</div>
          <div className="brandtxt">
            <b>BI SETBAY</b>
            <small>Analisis Setoran & Bayaran</small>
          </div>
        </div>

        <div className="navlabel">MENU DASHBOARD</div>
        <nav className="navlist">
          <button
            className={`navbtn ${page === "overview" ? "active" : ""}`}
            onClick={() => {
              setPage("overview");
              setMobileMenuOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard Utama</span>
          </button>
          <button
            className={`navbtn ${page === "transactions" ? "active" : ""}`}
            onClick={() => {
              setPage("transactions");
              setMobileMenuOpen(false);
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Data Transaksi</span>
            {filtered.length > 0 && <span className="navbadge">{compact(filtered.length)}</span>}
          </button>
          <button
            className={`navbtn ${page === "breakdown" ? "active" : ""}`}
            onClick={() => {
              setPage("breakdown");
              setMobileMenuOpen(false);
            }}
          >
            <ChartNoAxesCombined size={18} />
            <span>Analisis Rincian</span>
          </button>
          <button
            className={`navbtn ${page === "about" ? "active" : ""}`}
            onClick={() => {
              setPage("about");
              setMobileMenuOpen(false);
            }}
          >
            <Info size={18} />
            <span>Tentang Sistem</span>
          </button>
        </nav>

        <div className="sidefoot">
          <div className="avatar">{session ? "AD" : "BI"}</div>
          <div className="sideuser">
            <b>{session ? session.user?.email?.split("@")[0] || "Admin" : "Akses Publik"}</b>
            <small>{session ? "Administrator" : "Mode Penampil"}</small>
          </div>
          {!session && (
            <Link href="/login" className="side-login-btn" title="Masuk Admin">
              <LogIn size={15} />
            </Link>
          )}
        </div>

      </aside>

      {/* Main View Area */}
      <main className="main">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="crumb">
            Bank Indonesia &nbsp;/&nbsp; <b>{pageTitles[page][0]}</b>
          </div>
          <div className="topactions">
            <span className={`status ${configured ? "ok" : "warn"}`}>
              <i />
              {configured ? "Supabase Terkoneksi" : "Supabase Belum Disetel"}
            </span>

            {session ? (
              <button className="outline btn-sm" onClick={handleSignOut}>
                <LogOut size={14} /> Keluar
              </button>
            ) : (
              <Link href="/login" className="primary btn-sm login-topbar-link">
                <LogIn size={14} /> Login Admin
              </Link>
            )}
          </div>
        </header>

        <div className="content">
          {/* Hero Banner */}
          <section className="hero">
            <div>
              <div className="eyebrow">BANK INDONESIA · SISTEM INFORMASI SETBAY</div>
              <h1>{pageTitles[page][0]}</h1>
              <p>{pageTitles[page][1]}</p>
            </div>
            <div className="heroactions">
              <button className="outline" onClick={loadData} disabled={loading || busy}>
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                Muat Ulang
              </button>
              <button className="primary" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download size={15} />
                Ekspor CSV
              </button>
            </div>
          </section>


          {/* Notification Alert Message */}
          {msg && (
            <div className={`notice notice-${msg.type}`}>
              {msg.type === "success" && <CheckCircle2 size={18} />}
              {msg.type === "error" && <AlertTriangle size={18} />}
              {msg.type === "info" && <Info size={18} />}
              <span className="notice-text">{msg.text}</span>
              <button className="notice-close" onClick={() => setMsg(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Active Filter Bar (shown on Overview, Transactions, Breakdown) */}
          {page !== "about" && (
            <div className="filters-card">
              <div className="filters-header">
                <div className="filters-title">
                  <Filter size={15} />
                  <b>Filter Analitik Terintegrasi</b>
                </div>
                {(source !== "all" ||
                  year !== "all" ||
                  month !== "all" ||
                  branch !== "all" ||
                  type !== "all" ||
                  money !== "all" ||
                  bank !== "all" ||
                  denom !== "all" ||
                  query !== "") && (
                  <button className="btn-text-danger" onClick={resetFilters}>
                    <X size={13} /> Reset Semua Filter
                  </button>
                )}
              </div>

              <div className="filters-grid">
                <label>
                  <span>Sumber Data</span>
                  <select
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Sumber (Manado & Kastip)</option>
                    <option value="SETBAY MANADO">SETBAY MANADO</option>
                    <option value="SETBAY KASTIP">SETBAY KASTIP</option>
                  </select>
                </label>

                <label>
                  <span>Tahun Transaksi</span>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Tahun</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Bulan</span>
                  <select
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Bulan</option>
                    {Object.entries(MONTH_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Unit / Lokasi</span>
                  <select
                    value={branch}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Unit / Lokasi</option>
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Jenis Transaksi</span>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Jenis Transaksi</option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Jenis Uang</span>
                  <select
                    value={money}
                    onChange={(e) => {
                      setMoney(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Jenis Uang (ULE/UTLE/UPK)</option>
                    {availableMoneys.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Bank</span>
                  <select
                    value={bank}
                    onChange={(e) => {
                      setBank(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Bank</option>
                    {availableBanks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Pecahan / Denom</span>
                  <select
                    value={denom}
                    onChange={(e) => {
                      setDenom(e.target.value);
                      setPageNo(1);
                    }}
                  >
                    <option value="all">Semua Pecahan</option>
                    {availableDenoms.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* PAGE: OVERVIEW */}
          {page === "overview" && (
            <>
              {/* Executive KPI Cards */}
              <div className="kpis-grid">
                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-icon blue">
                      <Banknote size={20} />
                    </span>
                    <span className="tag">Total Transaksi</span>
                  </div>
                  <div className="kpi-label">Nilai Transaksi Terakumulasi</div>
                  <div className="kpi-val">{compact(totalAmount)}</div>
                  <div className="kpi-sub">{rup(totalAmount)}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-icon green">
                      <TrendingUp size={20} />
                    </span>
                    <span className="tag tag-green">Inflow (Masuk)</span>
                  </div>
                  <div className="kpi-label">Total Arus Masuk</div>
                  <div className="kpi-val">{compact(totalInflow)}</div>
                  <div className="kpi-sub">{rup(totalInflow)}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-icon red">
                      <TrendingDown size={20} />
                    </span>
                    <span className="tag tag-red">Outflow (Keluar)</span>
                  </div>
                  <div className="kpi-label">Total Arus Keluar</div>
                  <div className="kpi-val">{compact(totalOutflow)}</div>
                  <div className="kpi-sub">{rup(totalOutflow)}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className={`kpi-icon ${totalNetflow >= 0 ? "green" : "red"}`}>
                      {totalNetflow >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </span>
                    <span className={`tag ${totalNetflow >= 0 ? "tag-green" : "tag-red"}`}>
                      {totalNetflow >= 0 ? "Net Inflow" : "Net Outflow"}
                    </span>
                  </div>
                  <div className="kpi-label">Arus Bersih (Netflow)</div>
                  <div className={`kpi-val ${totalNetflow < 0 ? "negative" : "positive"}`}>
                    {compact(totalNetflow)}
                  </div>
                  <div className="kpi-sub">{rup(totalNetflow)}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-icon purple">
                      <Layers size={20} />
                    </span>
                    <span className="tag">Volume Fisik</span>
                  </div>
                  <div className="kpi-label">Jumlah Lembar / Keping</div>
                  <div className="kpi-val">{compact(totalPieces)}</div>
                  <div className="kpi-sub">{fmt(totalPieces)} lembar/keping</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-icon amber">
                      <FileSpreadsheet size={20} />
                    </span>
                    <span className="tag">Data Riil</span>
                  </div>
                  <div className="kpi-label">Total Baris Catatan</div>
                  <div className="kpi-val">{fmt(filtered.length)}</div>
                  <div className="kpi-sub">
                    {filtered.length > 0
                      ? `${filtered[0]?.transaction_date} (Terbaru)`
                      : "Belum ada transaksi"}
                  </div>
                </div>
              </div>

              {/* Charts Section: Row 1 */}
              <div className="grid2">
                <Panel
                  eyebrow="TREN HISTORIS"
                  title={year !== "all" ? `Inflow vs Outflow Bulanan (${year})` : "Inflow vs Outflow Tahunan"}
                  desc="Perbandingan total arus uang kartal yang disetorkan (inflow) dan ditarik (outflow)"
                >
                  <div className="chart-container">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={290}>
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                          <YAxis tickFormatter={compact} width={65} stroke="#64748b" fontSize={11} />
                          <Tooltip
                            formatter={(v: any) => [rup(Number(v)), ""]}
                            contentStyle={{
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                              border: "1px solid #e2e8f0",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="inflow" name="Inflow (Masuk)" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="outflow" name="Outflow (Keluar)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Tidak ada data untuk grafik tren.</div>
                    )}
                  </div>
                </Panel>

                <Panel
                  eyebrow="DISTRIBUSI TRANSAKSI"
                  title="Komposisi Jenis Transaksi"
                  desc="Proporsi frekuensi jenis transaksi setoran vs penarikan uang"
                >
                  <div className="chart-container">
                    {typesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                          <Pie
                            data={typesData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            innerRadius={45}
                            paddingAngle={2}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {typesData.map((e, i) => (
                              <Cell key={`cell-${i}`} fill={e.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [
                              `${fmt(Number(v))} transaksi (${rup(item.payload.amount)})`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Tidak ada data untuk komposisi transaksi.</div>
                    )}
                  </div>
                </Panel>
              </div>

              {/* Charts Section: Row 2 */}
              <div className="grid2">
                <Panel
                  eyebrow="PERFORMA PERBANKAN"
                  title="Top 8 Bank Berdasarkan Nilai Transaksi"
                  desc="Institusi perbankan dengan volume nominal setoran & bayaran terbesar"
                >
                  <div className="chart-container">
                    {topBanksData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={topBanksData}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tickFormatter={compact} stroke="#64748b" fontSize={11} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            stroke="#64748b"
                            fontSize={11}
                          />
                          <Tooltip
                            formatter={(v: any, _name: any, item: any) => [
                              rup(Number(v)),
                              item.payload.fullName,
                            ]}
                          />
                          <Bar dataKey="nilai" name="Nilai Transaksi" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Tidak ada data perbankan.</div>
                    )}
                  </div>
                </Panel>

                <Panel
                  eyebrow="DENOMINASI RUPIAH"
                  title="Distribusi Nilai Berdasarkan Pecahan"
                  desc="Nominal transaksi berdasarkan pecahan uang kertas dan logam"
                >
                  <div className="chart-container">
                    {denomData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={denomData}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis tickFormatter={compact} width={65} stroke="#64748b" fontSize={11} />
                          <Tooltip
                            formatter={(v: any, _name: any, item: any) => [
                              `${rup(Number(v))} (${fmt(item.payload.pieces)} lembar/keping)`,
                              "Nominal",
                            ]}
                          />
                          <Bar dataKey="nilai" name="Nominal (Rp)" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-chart">Tidak ada data pecahan.</div>
                    )}
                  </div>
                </Panel>
              </div>

              {/* Latest Transactions Table Preview */}
              <Panel
                eyebrow="MONITORING REALTIME"
                title="10 Transaksi Terbaru"
                desc="Pratinjau transaksi terkini dari database Supabase"
              >
                <TxTable
                  rows={sortedRows.slice(0, 10)}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={toggleSort}
                />
                <div className="panel-footer-action">
                  <button className="outline" onClick={() => setPage("transactions")}>
                    Lihat Semua {fmt(filtered.length)} Transaksi &rarr;
                  </button>
                </div>
              </Panel>
            </>
          )}

          {/* PAGE: TRANSACTIONS EXPLORER */}
          {page === "transactions" && (
            <Panel
              eyebrow="DATA EXPLORER & AUDIT"
              title="Daftar Lengkap Transaksi SETBAY"
              desc="Jelajahi, telusuri, dan verifikasi detail baris transaksi tanpa data sensitif rekening perbankan"
            >
              <div className="table-controls">
                <div className="search-wrap">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Cari bank, pecahan, jenis transaksi, lokasi..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPageNo(1);
                    }}
                  />
                  {query && (
                    <button className="clear-search" onClick={() => setQuery("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="table-meta">
                  <label className="page-size-selector">
                    <span>Tampilkan:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPageNo(1);
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                  <span className="records-count">
                    Menampilkan <b>{fmt(pageRows.length)}</b> dari <b>{fmt(filtered.length)}</b> baris
                  </span>
                </div>
              </div>

              <TxTable
                rows={pageRows}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={toggleSort}
              />

              <div className="pagination">
                <button
                  className="outline btn-sm"
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo((p) => p - 1)}
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </button>
                <span className="page-info">
                  Halaman <b>{pageNo}</b> dari <b>{totalPages}</b>
                </span>
                <button
                  className="outline btn-sm"
                  disabled={pageNo >= totalPages}
                  onClick={() => setPageNo((p) => p + 1)}
                >
                  Berikutnya <ChevronRight size={16} />
                </button>
              </div>
            </Panel>
          )}

          {/* PAGE: BREAKDOWN */}
          {page === "breakdown" && (
            <div className="grid2">
              <Panel
                eyebrow="AGREGASI JENIS UANG"
                title="Ringkasan Jenis Uang (ULE / UTLE / UPK)"
                desc="Klasifikasi kualitas dan kelayakan edar uang kartal"
              >
                <AggTable rows={group(filtered, "money_type")} />
              </Panel>

              <Panel
                eyebrow="AGREGASI PERBANKAN"
                title="Ringkasan Per Bank"
                desc="Akumulasi setoran dan penarikan per institusi perbankan"
              >
                <AggTable rows={group(filtered, "bank_name")} />
              </Panel>

              <Panel
                eyebrow="AGREGASI UNIT & KASTIP"
                title="Ringkasan Unit / Lokasi Kastip"
                desc="Perbandingan aktivitas kas antara Kantor Manado dan Sentra Kastip"
              >
                <AggTable rows={group(filtered, "branch_name")} />
              </Panel>

              <Panel
                eyebrow="AGREGASI PECAHAN"
                title="Ringkasan Denominasi Uang"
                desc="Distribusi nominal dan lembar/keping menurut nilai pecahan"
              >
                <AggTable rows={group(filtered, "denom")} />
              </Panel>
            </div>
          )}

          {/* PAGE: ABOUT & METHODOLOGY */}
          {page === "about" && (
            <div className="about-wrap">
              <div className="panel">
                <div className="panelhead">
                  <div>
                    <div className="eyebrow">METODOLOGI & ARSITEKTUR SISTEM</div>
                    <h2>Tentang Sistem BI SETBAY Bank Indonesia</h2>
                  </div>
                </div>
                <div className="prose">
                  <h3>1. Sumber & Integritas Data</h3>
                  <p>
                    Aplikasi ini dirancang untuk membaca dan menganalisis data riil dari buku kerja (workbook) Excel resmi{" "}
                    <strong>SETBAY MANADO</strong> dan <strong>SETBAY KASTIP</strong>. Tidak ada dataset dummy atau tiruan yang dibundel di dalam aplikasi. Jika basis data Supabase kosong, dashboard menampilkan status bersih dan memerlukan administrator untuk mengunggah workbook Excel resmi.
                  </p>

                  <h3>2. Kepatuhan Privasi & Rahasia Bank (Bank Secrecy)</h3>
                  <div className="security-card">
                    <ShieldCheck size={24} className="sec-icon" />
                    <div>
                      <b>Pengecualian Kolom Nomor Rekening</b>
                      <p>
                        Sesuai regulasi kerahasiaan perbankan, kolom <code>BANK_ACCOUNT</code> sengaja tidak dibuatkan kolom di skema basis data PostgreSQL Supabase, tidak diimpor ke server, tidak ditampilkan di tabel mana pun, dan tidak dapat diekspor ke file CSV.
                      </p>
                    </div>
                  </div>

                  <h3>3. Definisi Metrik Analisis</h3>
                  <ul>
                    <li>
                      <strong>Nilai Transaksi (Amount):</strong> Total nominal rupiah dari baris transaksi yang sesuai dengan filter aktif.
                    </li>
                    <li>
                      <strong>Inflow (Arus Masuk):</strong> Total nilai rupiah uang kartal yang disetorkan oleh perbankan atau unit kas ke Bank Indonesia.
                    </li>
                    <li>
                      <strong>Outflow (Arus Keluar):</strong> Nilai absolut penarikan uang kartal dari Bank Indonesia ke perbankan atau kastip.
                    </li>
                    <li>
                      <strong>Netflow (Arus Bersih):</strong> Arus kas bersih (Inflow dikurangi Outflow). Nilai positif menandakan penyerapan kas (net inflow), sedangkan nilai negatif menandakan pengeluaran kas neto (net outflow).
                    </li>
                    <li>
                      <strong>Volume Fisik:</strong> Jumlah total lembar uang kertas atau keping uang logam yang ditransaksikan.
                    </li>
                  </ul>

                  <h3>4. Status Koneksi & Database</h3>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td>Status Environment Supabase:</td>
                        <td>
                          <b>{configured ? "Terkonfigurasi" : "Belum Dikonfigurasi"}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Total Baris Transaksi Terbaca:</td>
                        <td>
                          <b>{fmt(rows.length)} baris</b>
                        </td>
                      </tr>
                      <tr>
                        <td>Row Level Security (RLS):</td>
                        <td>
                          <b>Aktif (SELECT Publik, INSERT/DELETE Dibatasi Admin)</b>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Admin Operations Box (Import & Data Cleanup) */}
          {session && (
            <div className="admin-box">
              <div className="admin-box-content">
                <div className="admin-box-title">
                  <Upload size={18} />
                  <b>Impor Workbook Excel SETBAY</b>
                </div>
                <p>
                  Pilih file Excel yang memuat sheet <code>SETBAY MANADO</code> atau <code>SETBAY KASTIP</code>. Sistem akan memetakan kolom secara cerdas, mengabaikan baris tanpa tanggal valid, dan menggantikan data sumber terkait secara aman tanpa menyentuh kolom rekening.
                </p>
              </div>

              <div className="admin-actions">
                <label className="primary upload-btn">
                  {busy ? "Memproses Impor..." : "Pilih File Excel"}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={busy}
                    onChange={handleImportExcel}
                  />
                </label>

                <button
                  type="button"
                  className="outline btn-danger"
                  disabled={busy || rows.length === 0}
                  onClick={handleDeleteAll}
                  title="Hapus semua data transaksi di database"
                >
                  <Trash2 size={15} /> Bersihkan Data
                </button>
              </div>
            </div>
          )}

          {/* Professional Footer */}
          <footer className="footer">
            <p>
              BI SETBAY · Sistem Business Intelligence Setoran & Bayaran Bank Indonesia · Supabase PostgreSQL + Vercel
            </p>
            <small>
              {loading
                ? "Memuat data dari Supabase..."
                : `${fmt(rows.length)} baris transaksi tersimpan · ${fmt(filtered.length)} baris tersaring`}
            </small>
          </footer>
        </div>
      </main>
    </div>
  );
}

// Panel Card Wrapper Component
function Panel({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panelhead">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          {desc && <p className="paneldesc">{desc}</p>}
        </div>
      </div>
      <div className="panelbody">{children}</div>
    </section>
  );
}

// Transaction Explorer Table Component
function TxTable({
  rows,
  sortField,
  sortOrder,
  onSort,
}: {
  rows: Tx[];
  sortField?: keyof Tx;
  sortOrder?: "asc" | "desc";
  onSort?: (field: keyof Tx) => void;
}) {
  const renderSortIcon = (field: keyof Tx) => {
    if (!onSort) return null;
    return (
      <span className="sort-indicator">
        <ArrowUpDown size={12} className={sortField === field ? "active-sort" : "dim-sort"} />
      </span>
    );
  };

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th onClick={() => onSort?.("transaction_date")} className={onSort ? "sortable" : ""}>
              Tanggal {renderSortIcon("transaction_date")}
            </th>
            <th onClick={() => onSort?.("source")} className={onSort ? "sortable" : ""}>
              Sumber {renderSortIcon("source")}
            </th>
            <th onClick={() => onSort?.("transaction_type")} className={onSort ? "sortable" : ""}>
              Jenis {renderSortIcon("transaction_type")}
            </th>
            <th onClick={() => onSort?.("bank_name")} className={onSort ? "sortable" : ""}>
              Bank {renderSortIcon("bank_name")}
            </th>
            <th onClick={() => onSort?.("branch_name")} className={onSort ? "sortable" : ""}>
              Unit/Kastip {renderSortIcon("branch_name")}
            </th>
            <th onClick={() => onSort?.("money_type")} className={onSort ? "sortable" : ""}>
              Jenis Uang {renderSortIcon("money_type")}
            </th>
            <th onClick={() => onSort?.("denom")} className={onSort ? "sortable" : ""}>
              Denom {renderSortIcon("denom")}
            </th>
            <th onClick={() => onSort?.("pieces")} className={onSort ? "sortable" : ""}>
              Volume {renderSortIcon("pieces")}
            </th>
            <th onClick={() => onSort?.("amount")} className={onSort ? "sortable" : ""}>
              Nominal {renderSortIcon("amount")}
            </th>
            <th onClick={() => onSort?.("inflow")} className={onSort ? "sortable" : ""}>
              Inflow {renderSortIcon("inflow")}
            </th>
            <th onClick={() => onSort?.("outflow")} className={onSort ? "sortable" : ""}>
              Outflow {renderSortIcon("outflow")}
            </th>
            <th onClick={() => onSort?.("netflow")} className={onSort ? "sortable" : ""}>
              Netflow {renderSortIcon("netflow")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.source}-${r.transaction_date}-${i}`}>
              <td>
                <span className="tx-date">{r.transaction_date}</span>
              </td>
              <td>
                <span className={`src-badge ${r.source.includes("MANADO") ? "src-manado" : "src-kastip"}`}>
                  {r.source.replace("SETBAY ", "")}
                </span>
              </td>
              <td>
                <span className="type-badge">{r.transaction_type || "—"}</span>
              </td>
              <td className="bank-col" title={r.bank_name}>
                {r.bank_name || "—"}
              </td>
              <td>{r.branch_name || "—"}</td>
              <td>
                <span className="money-badge">{r.money_type || "—"}</span>
              </td>
              <td>{r.denom || "—"}</td>
              <td className="num-col">{fmt(r.pieces)}</td>
              <td className="num-col font-bold">{rup(r.amount)}</td>
              <td className="num-col text-green">{rup(r.inflow)}</td>
              <td className="num-col text-red">{rup(Math.abs(r.outflow))}</td>
              <td className={`num-col font-bold ${r.netflow < 0 ? "negative" : "positive"}`}>
                {rup(r.netflow)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="empty-state">
          <FileSpreadsheet size={32} />
          <p>Tidak ada catatan transaksi yang sesuai dengan filter yang dipilih.</p>
        </div>
      )}
    </div>
  );
}

// Aggregation Table Component
function AggTable({
  rows,
}: {
  rows: {
    name: string;
    count: number;
    amount: number;
    inflow: number;
    outflow: number;
    netflow: number;
    pieces: number;
  }[];
}) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Frekuensi</th>
            <th>Volume (Lbr)</th>
            <th>Total Nominal</th>
            <th>Inflow</th>
            <th>Outflow</th>
            <th>Netflow</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="font-bold">{r.name}</td>
              <td className="num-col">{fmt(r.count)}</td>
              <td className="num-col">{fmt(r.pieces)}</td>
              <td className="num-col font-bold">{rup(r.amount)}</td>
              <td className="num-col text-green">{rup(r.inflow)}</td>
              <td className="num-col text-red">{rup(Math.abs(r.outflow))}</td>
              <td className={`num-col font-bold ${r.netflow < 0 ? "negative" : "positive"}`}>
                {rup(r.netflow)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="empty-state">
          <p>Belum ada data agregasi yang tersedia.</p>
        </div>
      )}
    </div>
  );
}
