import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContextValue";
import { SalaryBenchmarkModal } from "./SalaryBenchmarkModal";
import {
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  CircleHelp,
  FileText,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Search,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";

const primaryNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: Layers },
  { to: "/optimize", label: "Optimasi CV", icon: FileText },
  { to: "/tracker", label: "Tracker", icon: Briefcase },
  { to: "/jobs", label: "Lowongan", icon: Search },
];

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRecruiterMode = location.pathname === "/recruiter";
  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(`${path}/`));

  const closeMenus = () => {
    setDropdownOpen(false);
    setMoreOpen(false);
    setMobileMenuOpen(false);
  };

  const linkClass = (path: string, compact = false) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? "bg-forest-tint text-forest"
        : "text-ink-soft hover:bg-paper hover:text-ink"
    } ${compact ? "whitespace-nowrap" : ""}`;

  const mobileNavItems = user
    ? [
        ...primaryNavItems,
        { to: "/interview", label: "Latihan Wawancara", icon: Sparkles },
      ]
    : [
        { to: "/jobs", label: "Cari Lowongan", icon: Search },
      ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg"
            aria-label="CV Optimizer - beranda"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${
                isRecruiterMode ? "bg-blue-800" : "bg-forest"
              }`}
            >
              {isRecruiterMode ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </span>
            <span className="whitespace-nowrap font-serif text-lg font-bold tracking-tight text-ink sm:text-xl">
              CV Optimizer
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden shrink-0 items-center gap-1 xl:flex"
          >
            {user
              ? primaryNavItems.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={closeMenus}
                    aria-current={isActive(to) ? "page" : undefined}
                    className={linkClass(to, true)}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))
              : (
                  <>
                    <Link
                      to="/jobs"
                      onClick={closeMenus}
                      aria-current={isActive("/jobs") ? "page" : undefined}
                      className={linkClass("/jobs", true)}
                    >
                      <Search className="h-4 w-4" />
                      Cari Lowongan
                    </Link>
                    <Link
                      to="/recruiter"
                      onClick={closeMenus}
                      aria-current={isActive("/recruiter") ? "page" : undefined}
                      className={linkClass("/recruiter", true)}
                    >
                      <Building2 className="h-4 w-4" />
                      Recruiter
                    </Link>
                  </>
                )}

            <div className="relative">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="more-navigation"
                onClick={() => setMoreOpen((open) => !open)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  moreOpen ||
                  isActive("/interview") ||
                  isActive("/faq")
                    ? "bg-forest-tint text-forest"
                    : "text-ink-soft hover:bg-paper hover:text-ink"
                }`}
              >
                Lainnya
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>
              {moreOpen && (
                <div
                  id="more-navigation"
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-line bg-paper-raised p-2 shadow-lg"
                >
                  {user && (
                    <Link
                      to="/interview"
                      onClick={closeMenus}
                      className={linkClass("/interview")}
                    >
                      <Sparkles className="h-4 w-4" />
                      Latihan Wawancara
                    </Link>
                  )}
                  <Link
                    to={isRecruiterMode ? "/jobs" : "/recruiter"}
                    onClick={closeMenus}
                    className={linkClass(isRecruiterMode ? "/jobs" : "/recruiter")}
                  >
                    <Building2 className="h-4 w-4" />
                    {isRecruiterMode ? "Mode Pencari Kerja" : "Mode Recruiter"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setSalaryModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                  >
                    <Calculator className="h-4 w-4" />
                    Cek Gaji Tech
                  </button>
                  <Link
                    to="/faq"
                    onClick={closeMenus}
                    className={linkClass("/faq")}
                  >
                    <CircleHelp className="h-4 w-4" />
                    Pusat Bantuan
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <div className="relative hidden xl:block">
                <button
                  type="button"
                  aria-expanded={dropdownOpen}
                  aria-controls="account-navigation"
                  aria-label="Buka menu akun"
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex max-w-48 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-paper-raised p-1 pr-3 text-sm font-medium text-ink transition-colors hover:border-forest/50"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-tint text-forest">
                      <UserIcon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="hidden truncate sm:block">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft" />
                </button>
                {dropdownOpen && (
                  <div
                    id="account-navigation"
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-paper-raised p-2 shadow-lg"
                  >
                    <div className="border-b border-line px-3 py-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.name || "Akun"}
                      </p>
                      <p className="truncate text-xs text-ink-soft">{user.email}</p>
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-paper px-2.5 py-2 text-xs text-ink-soft">
                        <span>Kredit AI</span>
                        <span className="font-semibold text-forest">
                          {Math.max(
                            0,
                            (user.credits ?? 0) - (user.usedCredits ?? 0)
                          )}{" "}
                          tersisa
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/faq"
                      onClick={closeMenus}
                      className={linkClass("/faq")}
                    >
                      <CircleHelp className="h-4 w-4" />
                      Pusat Bantuan
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 xl:flex">
                {location.pathname !== "/login" && (
                  <Link
                    to="/login"
                    onClick={closeMenus}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                  >
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </Link>
                )}
                <Link
                  to="/optimize"
                  onClick={closeMenus}
                  className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-dark"
                >
                  Mulai
                </Link>
              </div>
            )}

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Tutup navigasi" : "Buka navigasi"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-raised text-ink transition-colors hover:border-forest xl:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Navigasi mobile"
            className="border-t border-line bg-paper-raised px-4 py-3 xl:hidden sm:px-6"
          >
            <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
              {mobileNavItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMenus}
                  aria-current={isActive(to) ? "page" : undefined}
                  className={linkClass(to)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <Link to="/faq" onClick={closeMenus} className={linkClass("/faq")}>
                <CircleHelp className="h-4 w-4" />
                Pusat Bantuan
              </Link>
              <Link
                to={isRecruiterMode ? "/jobs" : "/recruiter"}
                onClick={closeMenus}
                className={linkClass(isRecruiterMode ? "/jobs" : "/recruiter")}
              >
                <Building2 className="h-4 w-4" />
                {isRecruiterMode ? "Mode Pencari Kerja" : "Mode Recruiter"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSalaryModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink"
              >
                <Calculator className="h-4 w-4" />
                Cek Gaji Tech
              </button>
              {user ? (
                <>
                  <div className="flex items-center gap-3 border-t border-line px-3 py-3 sm:col-span-2">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-tint text-forest">
                        <UserIcon className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.name || "Akun"}
                      </p>
                      <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void logout();
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 sm:col-span-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </>
              ) : (
                <div className="flex gap-2 border-t border-line pt-3 sm:col-span-2">
                  <Link
                    to="/login"
                    onClick={closeMenus}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                  >
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </Link>
                  <Link
                    to="/optimize"
                    onClick={closeMenus}
                    className="flex flex-1 items-center justify-center rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white"
                  >
                    Mulai optimasi
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <SalaryBenchmarkModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
      />
    </>
  );
}
