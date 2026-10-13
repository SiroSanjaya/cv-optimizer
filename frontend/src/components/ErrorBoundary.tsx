import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-line bg-paper-raised p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rust-tint text-rust mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h2 className="font-serif text-xl font-bold text-ink">
              Terjadi Kendala Tampilan
            </h2>
            <p className="mt-2 text-xs text-ink-soft leading-relaxed">
              Terjadi kesalahan saat menampilkan halaman. Coba muat ulang, atau kembali ke beranda.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-paper-raised px-4 py-2.5 text-xs font-semibold text-ink hover:bg-paper transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
