import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginTab) {
        await login(email, password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        await register(email, password, fullName);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4 font-sans select-none">
      <div className="max-w-sm w-full bg-[#121215] border border-zinc-700/80 rounded-lg p-6 shadow-2xl space-y-5">
        {/* App Branding */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-100 mb-1 shadow-sm">
            <svg className="w-5 h-5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-3-3v6" />
            </svg>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">Smart Cloud Storage</h1>
          <p className="text-xs text-zinc-400 font-mono">Content-Addressable Object Platform</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-zinc-900 p-1 rounded-md border border-zinc-800">
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              isLoginTab
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              !isLoginTab
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="leading-tight font-mono text-[11px]">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLoginTab && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Yash Lakhe"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@example.com"
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLoginTab ? "••••••••" : "Minimum 8 characters"}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <span className="flex items-center gap-2 font-mono">
                <svg className="animate-spin h-3.5 w-3.5 text-zinc-900" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Authenticating...
              </span>
            ) : isLoginTab ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 text-center text-[10px] font-mono text-zinc-500 border-t border-zinc-800">
          Argon2id (m=64M, t=3, p=4) • RFC 7519 JWT
        </div>
      </div>
    </div>
  );
};
