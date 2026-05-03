import type React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}
