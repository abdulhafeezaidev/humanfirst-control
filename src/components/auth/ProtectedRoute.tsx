import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireOrg?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireOrg = false,
}) => {
  const { user, role, loading, organization } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Authenticating…</p>
      </div>
    );
  }

  // Not logged in -> send to auth with redirect state
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If specific roles are required:
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = role && allowedRoles.includes(role);
    if (!isAllowed) {
      // Role mismatch: redirect to appropriate panel
      if (role === 'student') {
        return <Navigate to="/student" replace />;
      }
      if (role === 'super_admin' || role === 'admin' || role === 'viewer') {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
