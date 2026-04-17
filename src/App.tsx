import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { DatabaseConnectionGuard } from "@/components/DatabaseConnectionGuard";

// Route-level code splitting: keeps the initial renderer bundle smaller,
// which significantly improves cold-start time for the packaged desktop app.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminDashboardV2 = lazy(() => import("./pages/AdminDashboardV2"));
const PolicyManagement = lazy(() => import("./pages/PolicyManagement"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const PolicyTransparency = lazy(() => import("./pages/PolicyTransparency"));
const PublicPolicyShare = lazy(() => import("./pages/PublicPolicyShare"));
const TrustAndEthics = lazy(() => import("./pages/TrustAndEthics"));
const Pricing = lazy(() => import("./pages/Pricing"));
const GTMStrategy = lazy(() => import("./pages/GTMStrategy"));
const PitchDeck = lazy(() => import("./pages/PitchDeck"));
const ThreatModel = lazy(() => import("./pages/ThreatModel"));
const Architecture = lazy(() => import("./pages/Architecture"));
const Infrastructure = lazy(() => import("./pages/Infrastructure"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const AiServicesPage = lazy(() => import("./pages/AiServicesPage"));
const TeamManagementPage = lazy(() => import("./pages/TeamManagementPage"));
const EnforcementPage = lazy(() => import("./pages/EnforcementPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DataExport = lazy(() => import("./pages/DataExport"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const AssignmentEditorPage = lazy(() => import("./pages/AssignmentEditorPage"));
const AssignmentModeFullPage = lazy(() => import("./pages/AssignmentModeFullPage"));
const VerifySubmissionPage = lazy(() => import("./pages/VerifySubmissionPage"));

const queryClient = new QueryClient();

function shouldUseHashRouter() {
  if (typeof window === 'undefined') return false;
  if (window.humanfirstDesktop?.isDesktop) return true;
  return window.location.protocol === 'file:';
}

const App = () => (
  <>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DatabaseConnectionGuard />
          <Toaster />
          <Sonner />
          {shouldUseHashRouter() ? (
            <HashRouter>
            <Suspense
              fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                  <div className="animate-pulse-soft text-primary">Loading…</div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/admin/signup" element={<AdminSignup />} />
                <Route path="/admin" element={<AdminDashboardV2 />} />
                <Route path="/admin/policies" element={<PolicyManagement />} />
                <Route path="/admin/students" element={<StudentsPage />} />
                <Route path="/admin/ai-services" element={<AiServicesPage />} />
                <Route path="/admin/team" element={<TeamManagementPage />} />
                <Route path="/admin/enforcement" element={<EnforcementPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/data-export" element={<DataExport />} />
                <Route path="/admin/logs" element={<AuditLogsPage />} />
                <Route path="/admin/verify-submission" element={<VerifySubmissionPage />} />
                <Route path="/admin/legacy" element={<AdminDashboard />} />
                <Route path="/admin/policy-transparency" element={<PolicyTransparency />} />
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/assignment-editor" element={<AssignmentEditorPage />} />
                <Route path="/assignment/:assignmentId/mode" element={<AssignmentModeFullPage />} />
                <Route path="/policy/share/:token" element={<PublicPolicyShare />} />
                <Route path="/trust" element={<TrustAndEthics />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/gtm" element={<GTMStrategy />} />
                <Route path="/pitch" element={<PitchDeck />} />
                <Route path="/threats" element={<ThreatModel />} />
                <Route path="/architecture" element={<Architecture />} />
                <Route path="/infrastructure" element={<Infrastructure />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </HashRouter>
          ) : (
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="animate-pulse-soft text-primary">Loading…</div>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/admin/signup" element={<AdminSignup />} />
                  <Route path="/admin" element={<AdminDashboardV2 />} />
                  <Route path="/admin/policies" element={<PolicyManagement />} />
                  <Route path="/admin/students" element={<StudentsPage />} />
                  <Route path="/admin/ai-services" element={<AiServicesPage />} />
                  <Route path="/admin/team" element={<TeamManagementPage />} />
                  <Route path="/admin/enforcement" element={<EnforcementPage />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                  <Route path="/admin/data-export" element={<DataExport />} />
                   <Route path="/admin/logs" element={<AuditLogsPage />} />
                   <Route path="/admin/verify-submission" element={<VerifySubmissionPage />} />
                   <Route path="/admin/legacy" element={<AdminDashboard />} />
                  <Route path="/admin/policy-transparency" element={<PolicyTransparency />} />
                  <Route path="/student" element={<StudentDashboard />} />
                  <Route path="/student/assignment-editor" element={<AssignmentEditorPage />} />
                  <Route path="/assignment/:assignmentId/mode" element={<AssignmentModeFullPage />} />
                  <Route path="/policy/share/:token" element={<PublicPolicyShare />} />
                  <Route path="/trust" element={<TrustAndEthics />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/gtm" element={<GTMStrategy />} />
                  <Route path="/pitch" element={<PitchDeck />} />
                  <Route path="/threats" element={<ThreatModel />} />
                  <Route path="/architecture" element={<Architecture />} />
                  <Route path="/infrastructure" element={<Infrastructure />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          )}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>

    </ThemeProvider>
  </>
);

export default App;
