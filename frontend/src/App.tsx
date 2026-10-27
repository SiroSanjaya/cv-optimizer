import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContextValue";
import { ErrorBoundary } from "./components/ErrorBoundary";

const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((module) => ({ default: module.LandingPage }))
);
const OptimizePage = lazy(() =>
  import("./pages/OptimizePage").then((module) => ({ default: module.OptimizePage }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const ApplicationsPage = lazy(() =>
  import("./pages/ApplicationsPage").then((module) => ({ default: module.ApplicationsPage }))
);
const JobsPage = lazy(() =>
  import("./pages/JobsPage").then((module) => ({ default: module.JobsPage }))
);
const InterviewPage = lazy(() =>
  import("./pages/InterviewPage").then((module) => ({ default: module.InterviewPage }))
);
const RecruiterPage = lazy(() =>
  import("./pages/RecruiterPage").then((module) => ({ default: module.RecruiterPage }))
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage }))
);
const FaqPage = lazy(() =>
  import("./pages/FaqPage").then((module) => ({ default: module.FaqPage }))
);
const VaultPage = lazy(() =>
  import("./pages/VaultPage").then((module) => ({ default: module.VaultPage }))
);

function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-ink-soft" role="status" aria-live="polite">
        <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-forest border-r-transparent" />
        Memeriksa sesi...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center p-8 text-center text-sm text-ink-soft" role="status" aria-live="polite">
              <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-forest border-r-transparent" />
              Memuat halaman...
            </div>
          }>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/optimize" element={<OptimizePage />} />
              <Route path="/recruiter" element={<RecruiterPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/vault" element={<VaultPage />} />
                <Route path="/tracker" element={<ApplicationsPage />} />
                <Route path="/interview" element={<InterviewPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}



export default App;
