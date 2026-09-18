import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SalaryBenchmarkModal } from "./SalaryBenchmarkModal";
import {
  FileText,
  Briefcase,
  Layers,
  Sparkles,
  LogOut,
  User as UserIcon,
  ChevronDown,
  LogIn,
  Building2,
  Calculator,
} from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isRecruiterMode = location.pathname === "/recruiter";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-105 ${
              isRecruiterMode ? "bg-blue-800" : "bg-forest"
            }`}>
              {isRecruiterMode ? <Building2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-ink">
                CV Optimizer
              </span>
              <span className={`hidden sm:inline-block ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isRecruiterMode ? "bg-blue-100 text-blue-800" : "bg-forest-tint text-forest"
              }`}>
                {isRecruiterMode ? "Recruiter Portal" : "AI Powered"}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                isActive("/dashboard")
                  ? "bg-forest-tint text-forest font-semibold"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              <Layers className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              to="/optimize"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                isActive("/optimize")
                  ? "bg-forest-tint text-forest font-semibold"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              <FileText className="h-4 w-4" />
              Optimize CV
            </Link>

            <Link
              to="/tracker"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                isActive("/tracker")
                  ? "bg-forest-tint text-forest font-semibold"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Tracker Lamaran
            </Link>

            <Link
              to="/jobs"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                isActive("/jobs")
                  ? "bg-forest-tint text-forest font-semibold"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Rekomendasi Loker
            </Link>

            <Link
              to="/interview"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                isActive("/interview")
                  ? "bg-forest-tint text-forest font-semibold"
                  : "text-ink-soft hover:bg-paper-raised hover:text-ink"
              }`}
            >
              <Sparkles className="h-4 w-4 text-forest" />
              <span>Latihan Wawancara</span>
              <span className="rounded bg-forest/10 px-1.5 py-0.2 text-[9px] font-bold text-forest uppercase">AI</span>
            </Link>
          </nav>

          {/* Action & User Auth Section */}
          <div className="flex items-center gap-2.5">
            {/* Quick Salary Benchmark Button */}
            <button
              onClick={() => setSalaryModalOpen(true)}
              className="hidden sm:flex items-center gap-1 rounded-full border border-line bg-paper-raised px-2.5 py-1 text-xs font-semibold text-ink-soft hover:text-ink hover:border-forest/40 transition-colors cursor-pointer"
              title="Kalkulator Gaji & Panduan Negosiasi Tech"
            >
              <Calculator className="h-3.5 w-3.5 text-forest" />
              <span>Cek Gaji Tech</span>
            </button>

            {/* Recruiter / HR Switcher Button */}
            {isRecruiterMode ? (
              <Link
                to="/jobs"
                className="flex items-center gap-1.5 rounded-full bg-forest px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-forest-dark transition-all"
              >
                <span>Mode Pencaker</span>
              </Link>
            ) : (
              <Link
                to="/recruiter"
                className="flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-900 shadow-xs hover:bg-blue-100 transition-all"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-700" />
                <span>Mode HR / Recruiter</span>
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-line bg-paper-raised p-1 pr-3 text-xs font-medium text-ink shadow-sm transition-all hover:border-forest/50"
                >

                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-tint text-forest">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <span className="max-w-[110px] truncate font-semibold">
                  {user.name || user.email.split("@")[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
              </button>

              {dropdownOpen && (
                <div
                  onMouseLeave={() => setDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-paper-raised p-2 shadow-lg z-50 text-xs"
                >
                  <div className="border-b border-line px-3 py-2">
                    <p className="font-semibold text-ink truncate">{user.name || "User"}</p>
                    <p className="text-[11px] text-ink-soft truncate">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between rounded bg-paper px-2 py-1 text-[10px] text-ink-soft">
                      <span>Kredit AI</span>
                      <span className="font-semibold text-forest">
                        {user.credits ? user.credits - (user.usedCredits || 0) : 10} tersisa
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-ink hover:bg-paper"
                    >
                      <Layers className="h-4 w-4 text-ink-soft" />
                      Dashboard Saya
                    </Link>
                    <Link
                      to="/tracker"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-ink hover:bg-paper"
                    >
                      <Briefcase className="h-4 w-4 text-ink-soft" />
                      Status Lamaran
                    </Link>
                    <Link
                      to="/jobs"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-ink hover:bg-paper"
                    >
                      <Briefcase className="h-4 w-4 text-ink-soft" />
                      Lowongan Cocok
                    </Link>
                    <Link
                      to="/interview"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-ink hover:bg-paper"
                    >
                      <Sparkles className="h-4 w-4 text-forest" />
                      Latihan Wawancara AI
                    </Link>
                  </div>


                  <div className="border-t border-line pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar (Sign Out)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-md border border-line bg-paper-raised px-3.5 py-1.5 text-xs font-semibold text-ink shadow-sm hover:border-forest/50 hover:text-forest transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Masuk
              </Link>
              <Link
                to="/optimize"
                className="rounded-md bg-forest px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-forest-dark transition-colors"
              >
                Coba Gratis
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
    <SalaryBenchmarkModal
      isOpen={salaryModalOpen}
      onClose={() => setSalaryModalOpen(false)}
    />
  </>
  );
}

