import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import RequireAuth from "./AuthGuard";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  fallbackPath = "/login" 
}: ProtectedRouteProps) {
  const location = useLocation();

  return (
    <RequireAuth>
      {/* You can add role-based checking here if needed */}
      {/* For now, just check if user is authenticated */}
      {children}
    </RequireAuth>
  );
}
