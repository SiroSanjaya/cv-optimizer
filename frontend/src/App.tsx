import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { OptimizePage } from "./pages/OptimizePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { JobsPage } from "./pages/JobsPage";
import { InterviewPage } from "./pages/InterviewPage";
import { RecruiterPage } from "./pages/RecruiterPage";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/optimize" element={<OptimizePage />} />
            <Route path="/tracker" element={<ApplicationsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/recruiter" element={<RecruiterPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}



export default App;
