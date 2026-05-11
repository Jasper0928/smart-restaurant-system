import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface ProtectedRouteProps {
  component: React.ComponentType;
}

/**
 * Wraps a component so that only authenticated admins can access it.
 * Redirects unauthenticated visitors to /admin-login.
 */
export default function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/admin-login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">驗證身份中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect is handled in useEffect; render nothing in the meantime
    return null;
  }

  return <Component />;
}
