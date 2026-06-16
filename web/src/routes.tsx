import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect } from "react";
import BuilderPlaceholder from "./pages/BuilderPlaceholder";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import PublicSurveyPlaceholder from "./pages/PublicSurveyPlaceholder";
import ResponsesView from "./pages/ResponsesView";
import { useAuthStore } from "./store/useAuthStore";

// Initialize auth state synchronously from localStorage on startup
useAuthStore.getState().initializeAuth();

// Root Component with reactive auth header/footer and theme manager
const RootComponent = () => {
  const { currentUser, isAuthenticated, logout } = useAuthStore();
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans transition-colors duration-200 relative overflow-hidden">
      {/* Editorial Navigation */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-white transition-colors"
            >
              DoCoDeGo
            </Link>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 rounded">
              v1.0
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-250 transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] max-w-[150px] truncate">
                    {currentUser?.username}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/"
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main viewport */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

// Root Route layout
const rootRoute = createRootRoute({
  component: RootComponent,
});

// Index Route (Redirects to dashboard if already authenticated)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Landing,
});

// Dashboard Route (Protected)
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: Dashboard,
});

// Builder Route (Protected)
const builderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/builder/$surveyId",
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: BuilderPlaceholder,
});

// Public Survey Route (Public anonymous)
const publicSurveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/s/$surveyId",
  component: PublicSurveyPlaceholder,
});

// Responses View Route (Protected)
const responsesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard/$surveyId/responses",
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: ResponsesView,
});

// Create Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  builderRoute,
  publicSurveyRoute,
  responsesRoute,
]);

// Instantiate router
export const router = createRouter({ routeTree });

// Register Router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
