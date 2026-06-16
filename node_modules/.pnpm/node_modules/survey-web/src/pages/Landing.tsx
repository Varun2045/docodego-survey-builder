import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthError, login, register } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";

export default function Landing() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      if (isSignUp) {
        const data = await register(username, password);
        setAuth(data.user, data.token);
      } else {
        const data = await login(username, password);
        setAuth(data.user, data.token);
      }
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      console.error(err);
      if (isSignUp && err instanceof AuthError && err.usernameTaken) {
        setError(err.message);
        setSuggestions(err.suggestions || []);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An authentication error occurred.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] pt-16 pb-12 px-4 animate-fade-in">
      {/* Sleek, Vercel/Linear style Login Card */}
      <div className="w-full max-w-[360px] bg-white border border-zinc-200 rounded-2xl p-8 space-y-6 shadow-2xl transition-all duration-300">
        {/* Brand header */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-1.5 justify-center mb-1">
            <span className="text-md font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              DoCoDeGo
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-500 rounded">
              v1.0
            </span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="text-xs text-zinc-500">
            {isSignUp
              ? "Enter your details to create your account"
              : "Enter your details to access your dashboard"}
          </p>
        </div>

        {/* Error Message with username suggestions */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 text-xs leading-normal space-y-2">
            <div>{error}</div>
            {suggestions.length > 0 && (
              <div className="pt-2 space-y-1.5 border-t border-rose-500/10">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block tracking-wider uppercase">
                  Suggested Usernames:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setUsername(suggestion);
                        setSuggestions([]);
                      }}
                      className="px-2.5 py-1 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-white rounded text-[11px] font-mono transition-all cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase block"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              placeholder="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSuggestions([]);
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase block"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-[#673ab7] to-indigo-600 hover:from-[#7b4fc6] hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <title>Loading</title>
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {isSignUp ? "Creating account..." : "Signing in..."}
              </>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuggestions([]);
            }}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-250 transition-colors font-medium cursor-pointer underline underline-offset-4"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Create one"}
          </button>
        </div>

        {/* Quiet disclaimer copy */}
        <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-600 leading-normal px-2">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
