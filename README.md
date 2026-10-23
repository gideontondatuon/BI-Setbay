# BI SETBAY — Executive BI Dashboard (Supabase + Vercel)

Aplikasi Web Business Intelligence (BI) modern berbasis **Next.js (App Router)**, **TypeScript**, dan **Supabase PostgreSQL** untuk menganalisis data riil peredaran uang kartal dari buku kerja (workbook) resmi **SETBAY MANADO** dan **SETBAY KASTIP** Bank Indonesia.

Sistem tidak membundel dataset dummy tiruan. Jika basis data Supabase masih kosong, dashboard menampilkan status bersih dan menyediakan fitur impor file workbook Excel bagi administrator.

---

## Fitur Utama

- **Dashboard Analitik Eksekutif**:
  - Total Nilai Transaksi terakumulasi.
  - Total Arus Masuk (Inflow) & Arus Keluar (Outflow).
  - Netflow (Arus Kas Bersih) dengan indikator surplus/defisit.
  - Volume Fisik (total lembar uang kertas dan keping uang logam).
  - Grafik tren historis per tahun dan per bulan (Inflow vs Outflow).
  - Komposisi transaksi per jenis transaksi (Pie/Donut chart interaktif).
  - Peringkat Top 8 Bank berdasarkan volume transaksi nominal.
  - Distribusi nominal berdasarkan denominasi pecahan uang rupiah.
- **Filter Analitik Terintegrasi**:
  - Multi-filter instan: Sumber Data (Manado/Kastip), Tahun, Bulan, Unit/Lokasi, Jenis Transaksi, Kategori Uang (ULE/UTLE/UPK), Bank, dan Pecahan (Denom).
  - Tombol reset filter satu-klik.
- **Data Explorer & Audit**:
  - Tabel transaksi lengkap dengan pencarian real-time lintas kolom.
  - Pengurutan kolom (sorting) dinamis (Tanggal, Bank, Nominal, Inflow, Outflow, Netflow, Lembar).
  - Paginasi dengan opsi ukuran halaman (25, 50, 100 baris per halaman).
  - Ekspor seluruh data tersaring ke format file CSV UTF-8.
- **Analisis Rincian & Agregasi**:
  - Komparasi tabel multidimensi per Jenis Uang, Per Bank, Per Unit Kerja/Kastip, dan Per Denominasi Pecahan.
- **Impor & Validasi Workbook Cerdas**:
  - Pemetaan kolom cerdas (fuzzy matching) yang toleran terhadap variasi penamaan kolom dan spasi.
  - Parsing tanggal tangguh yang mendukung standar serial Excel (`SSF`), format Indonesia (`DD/MM/YYYY`, `DD-MM-YYYY`), format internasional (`YYYY-MM-DD`), dan format 2-digit tahun.
  - Penyimpanan batch otomatis ke Supabase dengan status progres.
- **Kepatuhan Privasi & Rahasia Bank**:
  - Kolom sensitif nomor rekening (`BANK_ACCOUNT`) sengaja **TIDAK** dipetakan ke skema basis data PostgreSQL, tidak disimpan di server, tidak ditampilkan di antarmuka, dan tidak dapat diekspor.
- **Antarmuka Responsif & Modern**:
  - Palet warna eksekutif Bank Indonesia (Deep Navy, Royal Blue, Emerald, Crimson).
  - Dukungan tampilan desktop, tablet, dan drawer navigasi mobile.

---

## Prasyarat & Lingkungan

- **Node.js** v18+ atau v20+
- **Proyek Supabase** (PostgreSQL Database + Supabase Auth)
- Akun hosting **Vercel** (opsional untuk deployment produksi)

---

## Setup Supabase

1. Buka dashboard proyek di [Supabase](https://supabase.com).
2. Buka menu **SQL Editor**, buat kueri baru, lalu salin dan jalankan seluruh isi file [`supabase/schema.sql`](supabase/schema.sql).
3. Buat akun administrator di menu **Authentication → Users** (klik *Add User* atau *Invite User*).
4. Ambil kredensial API di **Project Settings → API**:
   - Salin **Project URL**
   - Salin **anon/publishable key**
5. Buat file `.env.local` di root proyek (atau salin dari `.env.example`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
   ```
   > **PENTING**: Jangan pernah memasukkan `service_role` key ke dalam frontend atau variabel dengan prefix `NEXT_PUBLIC_*`.

---

## Menjalankan Proyek Secara Lokal

1. Pasang seluruh dependensi:
   ```bash
   npm install
   ```

2. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```

3. Buka browser pada alamat [http://localhost:3000](http://localhost:3000).

4. Verifikasi build produksi dan linting:
   ```bash
   npm run lint
   npm run build
   ```

---

## Panduan Impor Workbook Excel

1. Masuk ke dashboard, klik tombol **Login Admin** di pojok kanan atas.
2. Masukkan email dan password akun administrator yang telah dibuat di Supabase Auth.
3. Kotak manajemen impor akan muncul di bagian bawah dashboard.
4. Klik **Pilih File Excel** dan pilih file workbook yang memuat sheet `SETBAY MANADO` dan/atau `SETBAY KASTIP`.
5. Sistem akan:
   - Membaca sheet dan memvalidasi tanggal transaksi.
   - Mengabaikan baris tanpa tanggal yang valid atau baris ringkasan/catatan kaki.
   - Mengganti data lama untuk sumber terkait (`source = 'SETBAY MANADO'` atau `'SETBAY KASTIP'`).
   - Menyimpan transaksi ke tabel Supabase dalam batch berisi 500 baris.
   - Memastikan nomor rekening dilewati sepenuhnya demi kepatuhan privasi perbankan.

---

## Panduan Deployment ke Vercel

1. Push commit ke repository GitHub:
   ```bash
   git add .
   git commit -m "feat: BI SETBAY executive dashboard system"
   git push -u origin main
   ```
2. Buka [Vercel Dashboard](https://vercel.com), klik **Add New Project**, lalu import repository **BI-Setbay**.
3. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL proyek Supabase Anda.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Kunci anonim publik Supabase Anda.
4. Klik **Deploy**. Vercel akan otomatis membangun dan merilis dashboard.

---

## Struktur Direktori

```
├── .eslintrc.json          # Konfigurasi ESLint Next.js
├── .gitignore              # Proteksi file rahasia, env, build, dan node_modules
├── next.config.mjs         # Konfigurasi Next.js
├── package.json            # Daftar dependensi dan scripts
├── README.md               # Dokumentasi lengkap sistem
├── tsconfig.json           # Konfigurasi TypeScript (ES2020)
├── src/
│   ├── app/
│   │   ├── globals.css     # Design system & stylesheet responsif
│   │   ├── layout.tsx      # Root layout, font Plus Jakarta Sans & metadata
│   │   └── page.tsx        # Dashboard interaktif & visualisasi BI
│   └── lib/
│       ├── excel.ts        # Helper parsing cerdas Excel & normalisasi tanggal
│       ├── supabase.ts     # Inisialisasi aman client Supabase
│       └── types.ts        # Definisi antarmuka TypeScript transaksi (Tx)
└── supabase/
    └── schema.sql          # Skema tabel PostgreSQL, indeks, dan kebijakan RLS
```

---

## Lisensi & Kepatuhan
Aplikasi ini dikembangkan untuk kebutuhan pelaporan analitik internal dan visualisasi operasional data transaksi setoran dan bayaran peredaran uang rupiah Bank Indonesia. Seluruh hak cipta dilindungi.
