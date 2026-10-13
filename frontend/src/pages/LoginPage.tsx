import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContextValue";
import { Header } from "../components/Header";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface GoogleCredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: "outline"; size: "large"; width: number; text: "signin_with" }
          ) => void;
        };
      };
    };
  }
}

export function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const credentialHandler = useRef<(credential: string) => void>(() => {});

  useEffect(() => {
    credentialHandler.current = (credential) => {
      void (async () => {
        setAuthError(null);
        try {
          await loginWithGoogle(credential);
          const requestedPath = (location.state as { from?: unknown } | null)?.from;
          const destination =
            typeof requestedPath === "string" &&
            requestedPath.startsWith("/") &&
            !requestedPath.startsWith("//")
              ? requestedPath
              : "/dashboard";
          navigate(destination);
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : "Gagal masuk dengan Google.");
        }
      })();
    };
  }, [loginWithGoogle, location.state, navigate]);

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) return;

    let active = true;
    const renderGoogleButton = () => {
      if (!active || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          if (credential) credentialHandler.current(credential);
          else setAuthError("Google tidak mengembalikan kredensial login.");
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 280,
        text: "signin_with",
      });
    };

    const scriptId = "google-identity-services";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const handleScriptError = () => {
      if (active) setAuthError("Layanan login Google tidak dapat dimuat. Coba muat ulang halaman.");
    };

    if (window.google) {
      renderGoogleButton();
    } else if (script) {
      script.addEventListener("load", renderGoogleButton);
      script.addEventListener("error", handleScriptError);
    } else {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderGoogleButton);
      script.addEventListener("error", handleScriptError);
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      script?.removeEventListener("load", renderGoogleButton);
      script?.removeEventListener("error", handleScriptError);
    };
  }, [googleClientId]);

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
                <span>Analisis kecocokan skill pada CV</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Jelajahi rekomendasi lowongan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <span>Pipeline Tracker HR & User Interview</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-white/60">
              CV dan teks yang kamu kirim diproses oleh layanan AI pihak ketiga. Baca kebijakan privasi sebelum melanjutkan.
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

            <div className="mt-6 flex min-h-12 justify-center" ref={buttonRef} />
            {!googleClientId && (
              <p className="mt-3 text-center text-xs text-ink-soft" role="status">
                Login Google belum dikonfigurasi. Atur VITE_GOOGLE_CLIENT_ID untuk mengaktifkannya.
              </p>
            )}
            {googleClientId && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-soft" role="note">
                Jika tombol tidak muncul atau login gagal, domain aplikasi perlu diizinkan pada konfigurasi OAuth Google.
              </p>
            )}
            {authError && (
              <p className="mt-3 text-center text-xs text-rust" role="alert">
                {authError}
              </p>
            )}

            <p className="mt-6 text-center text-[11px] text-ink-soft">
              Dengan masuk, kamu menyetujui pemrosesan data sesuai{" "}
              <Link to="/privacy" className="font-semibold text-forest underline">
                kebijakan privasi
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
