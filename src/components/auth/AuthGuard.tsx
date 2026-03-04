import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useRoleBasedAuth } from "@/hooks/useRoleBasedAuth";
import { canAccessDashboard, canAccessRoleSetup } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requireOnboarding = false,
  redirectTo,
  fallback,
}: AuthGuardProps) {
  const { user, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useRoleBasedAuth();
  
  const loading = authLoading || roleLoading;

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !user) {
    return <Navigate to={redirectTo || "/login"} replace />;
  }

  // If user is logged in but onboarding is required
  if (user && requireOnboarding) {
    if (!role) {
      return <Navigate to={redirectTo || "/"} replace />;
    }
  }

  // If user is logged in but onboarding is not complete
  if (user && !requireOnboarding) {
    if (!role) {
      return <Navigate to="/role-setup" replace />;
    }
  }

  return <>{children}</>;
}

// Specific guard components for common use cases
export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthUser();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireOnboarding={false}>
      {children}
    </AuthGuard>
  );
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireOnboarding={true}>
      {children}
    </AuthGuard>
  );
}
