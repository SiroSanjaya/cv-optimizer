import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Header";
import { Sparkles, CheckCircle2, ArrowRight, UserCheck } from "lucide-react";

export function LoginPage() {
  const { loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [demoName, setDemoName] = useState("Ahmad Fauzi");
  const [demoEmail, setDemoEmail] = useState("ahmad.fauzi@gmail.com");

  const handleDemoSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithDemo(demoName, demoEmail);
      navigate("/dashboard");
    } catch (err) {
      alert("Gagal masuk. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatedGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Simulates Google OAuth flow token
      await loginWithDemo("Muhamad Sirojudin", "muhamad.sirojudin@gmail.com");
      navigate("/dashboard");
    } catch (err) {
      alert("Google sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-xl md:grid-cols-12">
          {/* Left Hero Brand Panel */}
          <div className="bg-gradient-to-br from-forest to-forest-dark p-8 text-white md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-emerald-300" />
              </div>
              <h2 className="mt-6 font-serif text-2xl font-bold leading-snug">
                Karier Impian Dimulai dari CV yang Tepat.
              </h2>
              <p className="mt-3 text-xs text-white/80 leading-relaxed">
                Akses dashboard terpadu untuk optimasi CV dengan AI, pemantauan status interview, dan rekomendasi loker spesifik profilmu.
              </p>
            </div>

            <div className="mt-8 space-y-3 text-xs text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Probabilitas Lolos Screening ATS Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Rekomendasi Loker Otomatis Terhubung</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Pipeline Tracker HR & User Interview</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-white/60">
              Data pribadi dan CV kamu dienkripsi dengan standar keamanan tinggi.
            </div>
          </div>

          {/* Right Login Options Panel */}
          <div className="p-8 md:col-span-7 flex flex-col justify-center">
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">
                Selamat Datang! 👋
              </h1>
              <p className="mt-1 text-xs text-ink-soft">
                Pilih opsi masuk untuk mengelola CV dan memantau status lamaran kamu.
              </p>
            </div>

            {/* Google One-Click Sign In */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSimulatedGoogleSignIn}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-xs font-semibold text-ink shadow-sm transition-all hover:border-forest/60 hover:bg-gray-50 focus:outline-none"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </button>
            </div>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <span className="relative bg-paper-raised px-3 text-[11px] font-medium text-ink-soft uppercase tracking-wider">
                Atau Mode Demo Cepat
              </span>
            </div>

            {/* Instant Demo Login Form */}
            <form onSubmit={handleDemoSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Nama Pengguna
                </label>
                <input
                  type="text"
                  required
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-forest focus:outline-none"
                  placeholder="nama@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-forest-dark focus:outline-none"
              >
                <UserCheck className="h-4 w-4" />
                <span>Masuk Sekarang (Akses Demo)</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-ink-soft">
              Belum ingin masuk? Kamu tetap bisa{" "}
              <Link to="/optimize" className="font-semibold text-forest underline">
                coba optimasi langsung di sini
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        CV Optimizer — Solusi cerdas pencari kerja Indonesia.
      </footer>
    </div>
  );
}
