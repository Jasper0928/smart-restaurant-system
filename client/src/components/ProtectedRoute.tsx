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
  // staleTime: 0 forces a fresh network request every time this mounts,
  // preventing stale pre-login cache from causing false redirects.
  const { data: user, isLoading, isFetched } = trpc.auth.me.useQuery(undefined, {
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    // Only redirect after we have a confirmed fresh result
    if (isFetched && !isLoading && !user) {
      navigate("/admin-login");
    }
  }, [user, isLoading, isFetched, navigate]);

  if (isLoading || !isFetched) {
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
    return null;
  }

  return <Component />;
}

