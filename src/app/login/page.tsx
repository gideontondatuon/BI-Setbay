"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If already logged in, redirect immediately to dashboard
    if (configured) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.replace("/");
        }
      });
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!configured) {
      setErrorMsg("Koneksi Supabase belum dikonfigurasi pada environment.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Redirect to dashboard upon successful login
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(
        err.message === "Invalid login credentials"
          ? "Email atau kata sandi tidak sesuai. Silakan periksa kembali."
          : err.message || "Gagal masuk ke sistem."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      {/* Left Column: Visual Branding Panel */}
      <div className="login-brand-panel">
        <div className="brand-panel-content">
          <div className="brand-header">
            <div className="brand-badge">BI</div>
            <div className="brand-title">
              <h3>Dashboard Cashflow SETBAY</h3>
              <p>Pengelolaan Uang Rupiah</p>
            </div>
          </div>

          <div className="brand-headline">
            <h1>
              Informasi yang jelas.<br />
              Pengelolaan yang terkendali.
            </h1>
            <p>
              Ruang kerja Unit Pengelolaan Uang Rupiah untuk mengelola data cashflow,
              memverifikasi transaksi, dan menerbitkan informasi agregat.
            </p>
          </div>

          <div className="brand-footer">
            <p className="institution-name">Kantor Perwakilan Bank Indonesia</p>
            <p className="institution-region">Provinsi Sulawesi Utara</p>
          </div>
        </div>
      </div>

      {/* Right Column: Dedicated Login Form Panel */}
      <div className="login-form-panel">
        <div className="form-panel-container">
          <div className="back-link-wrap">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} />
              <span>Kembali ke dashboard publik</span>
            </Link>
          </div>

          <div className="form-content">
            <div className="form-eyebrow">AKSES TERBATAS</div>
            <h2 className="form-title">Masuk Admin</h2>
            <p className="form-subtitle">
              Gunakan akun pribadi yang diberikan oleh pengelola sistem.
            </p>

            {errorMsg && (
              <div className="login-error-alert">
                <AlertCircle size={18} className="error-icon" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-group">
                <label htmlFor="email">Nama pengguna / Email:</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@bi.go.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="password">Sandi:</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit-login-btn"
                disabled={loading}
              >
                <span>{loading ? "Memverifikasi..." : "Masuk ke ruang kerja"}</span>
                <ArrowRight size={16} className={loading ? "spin" : ""} />
              </button>
            </form>

            <div className="form-security-note">
              <p>
                Akses dan aktivitas sensitif dicatat untuk audit. Hubungi Super Admin apabila Anda memerlukan akses atau pemulihan akun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
