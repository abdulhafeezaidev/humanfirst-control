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
const DesktopDiagnostics = lazy(() => import("./pages/DesktopDiagnostics"));

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AppRole } from "@/lib/permissions";

const queryClient = new QueryClient();

function shouldUseHashRouter() {
  if (typeof window === 'undefined') return false;
  if (window.humanfirstDesktop?.isDesktop) return true;
  return window.location.protocol === 'file:';
}

const adminRoles: AppRole[] = ['super_admin', 'admin', 'viewer'];
const studentRoles: AppRole[] = ['student', 'super_admin', 'admin'];

const AppRoutes = () => (
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

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={adminRoles}><AdminDashboardV2 /></ProtectedRoute>} />
      <Route path="/admin/policies" element={<ProtectedRoute allowedRoles={adminRoles}><PolicyManagement /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={adminRoles}><StudentsPage /></ProtectedRoute>} />
      <Route path="/admin/ai-services" element={<ProtectedRoute allowedRoles={adminRoles}><AiServicesPage /></ProtectedRoute>} />
      <Route path="/admin/team" element={<ProtectedRoute allowedRoles={adminRoles}><TeamManagementPage /></ProtectedRoute>} />
      <Route path="/admin/enforcement" element={<ProtectedRoute allowedRoles={adminRoles}><EnforcementPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={adminRoles}><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin/data-export" element={<ProtectedRoute allowedRoles={adminRoles}><DataExport /></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={adminRoles}><AuditLogsPage /></ProtectedRoute>} />
      <Route path="/admin/verify-submission" element={<ProtectedRoute allowedRoles={adminRoles}><VerifySubmissionPage /></ProtectedRoute>} />
      <Route path="/admin/legacy" element={<ProtectedRoute allowedRoles={adminRoles}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/policy-transparency" element={<ProtectedRoute allowedRoles={adminRoles}><PolicyTransparency /></ProtectedRoute>} />

      {/* Student Protected Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/signup" element={<Auth />} />
      <Route path="/student/assignment-editor" element={<ProtectedRoute allowedRoles={studentRoles}><AssignmentEditorPage /></ProtectedRoute>} />
      <Route path="/assignment/:assignmentId/mode" element={<ProtectedRoute allowedRoles={studentRoles}><AssignmentModeFullPage /></ProtectedRoute>} />

      {/* Public / Diagnostic Routes */}
      <Route path="/desktop-diagnostics" element={<DesktopDiagnostics />} />
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
);

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
              <AppRoutes />
            </HashRouter>
          ) : (
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          )}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </>
);

export default App;
