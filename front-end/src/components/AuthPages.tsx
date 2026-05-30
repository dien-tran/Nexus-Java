import React, { useState } from 'react';
import { Eye, EyeOff, BookOpen, PenTool } from 'lucide-react';
import { createUser, loginUser, setStoredSession } from '../lib/api.js';

interface AuthPagesProps {
  initialIsSignIn: boolean;
  onSuccess: (session: { id?: string; name: string; email: string }) => void;
  onBackToLanding: () => void;
}

export default function AuthPages({ initialIsSignIn, onSuccess, onBackToLanding }: AuthPagesProps) {
  const [isSignIn, setIsSignIn] = useState(initialIsSignIn);
  const [username, setUsername] = useState('writer_01');
  const [email, setEmail] = useState('pen@editorialflow.com');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please fill in all required fields');
      return;
    }

    if (!isSignIn) {
      if (!username) {
        setErrorMsg('Please specify a username');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const createdUser = isSignIn ? null : await createUser(username, email, password);
      const auth = await loginUser(email, password);

      if (!auth.authenticated || !auth.token) {
        throw new Error('Authentication failed');
      }

      const session = {
        id: createdUser?.id,
        name: createdUser?.name || username || email.split('@')[0] || 'User',
        email: createdUser?.email || email
      };

      setStoredSession(auth.token, session);
      onSuccess(session);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center font-sans relative px-4 py-8">
      {/* Background Decorative Gradient element */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
        <div className="w-[700px] h-[700px] bg-surface-emphasis rounded-full blur-[100px]" />
      </div>

      <button
        onClick={onBackToLanding}
        className="absolute top-6 left-6 text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-ink hover:underline cursor-pointer"
      >
        ← Back to Home
      </button>

      {/* Auth Content Layout */}
      {isSignIn ? (
        /* Sign In Mode (Screenshot 10) */
        <div className="z-10 w-full max-w-[440px] flex flex-col items-center">
          {/* Main Logo & Sub */}
          <div className="text-center mb-8">
            <h1
              onClick={onBackToLanding}
              className="font-serif text-4.5xl text-primary tracking-tight mb-1 cursor-pointer"
            >
              Nexus Flow
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-mono text-ink-muted">
              The Workspace for Focused Minds
            </p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-surface-card border border-border-hairline rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
            <header className="mb-6 space-y-1">
              <h2 className="font-serif text-2xl text-ink font-medium">Welcome Back</h2>
              <p className="text-xs text-ink-muted">Please enter your credentials to access your workspace.</p>
            </header>

            {errorMsg && (
              <div className="p-3 bg-error-container text-error rounded-md text-xs mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., pen@editorialflow.com"
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-sm text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/35"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-[10px] font-semibold text-[#8f482f] hover:underline">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-sm text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/35 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep Signed In */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  defaultChecked
                  className="w-4 h-4 rounded border-border-hairline text-primary focus:ring-primary/20 bg-canvas"
                />
                <label htmlFor="remember-me" className="text-xs text-ink-muted cursor-pointer transition-colors hover:text-ink">
                  Keep me signed in for 30 days
                </label>
              </div>

              {/* Submit Sign In */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#cc785c] hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-xs hover:shadow-sm transition-all focus:ring-3 focus:ring-primary/20 pt-2 cursor-pointer"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border-hairline text-center space-y-3">
              <p className="text-xs text-ink-muted">New to the platform?</p>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setIsSignIn(false);
                }}
                className="w-full py-2 border border-border-hairline hover:bg-surface-emphasis rounded-lg text-xs font-semibold text-ink hover:text-[#8f482f] transition-all cursor-pointer"
              >
                Create an Account
              </button>
            </div>
          </div>

          {/* Quote (Screenshot 10 Footer) */}
          <div className="mt-8 text-center max-w-xs opacity-50 hover:opacity-100 transition-opacity">
            <p className="font-serif italic text-sm text-ink leading-relaxed">
              "Order and simplification are the first steps toward the mastery of a subject."
            </p>
            <p className="text-[9px] uppercase tracking-widest text-ink-muted font-mono mt-1">
              Thoman Mann
            </p>
          </div>
        </div>
      ) : (
        /* Create Account Mode (Screenshot 9 split layout) */
        <div className="z-10 w-full max-w-[860px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-canvas/30 backdrop-blur-md border border-border-hairline rounded-2xl p-6 md:p-8 shadow-lg">
          {/* Left Column Description */}
          <div className="md:col-span-5 space-y-6 flex flex-col justify-center h-full pr-0 md:pr-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen size={22} className="stroke-[2.5px]" />
                <span className="font-serif text-lg font-bold">Nexus Flow</span>
              </div>
              <h2 className="font-serif text-3xl leading-tight text-ink font-semibold">
                Begin your next chapter in focused productivity.
              </h2>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Join a community of writers, editors, and deep thinkers. Our platform provides the literary atmosphere your best work deserves, powered by invisible intelligence.
            </p>

            {/* Quote Card (Screenshot 9 left footer) */}
            <div className="bg-surface-card border border-border-hairline rounded-lg p-4 space-y-2 mt-2">
              <p className="font-serif italic text-xs text-primary leading-relaxed">
                "The interface feels like a high-end publication, not a messy app."
              </p>
              <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                Marcus Chen, Senior Editor
              </span>
            </div>
          </div>

          {/* Right Column Form */}
          <div className="md:col-span-7 bg-surface-card border border-border-hairline rounded-xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-medium text-ink">Create Account</h3>
              <p className="text-xs text-ink-muted">Please provide your details to register.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-error-container text-error rounded-md text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="writer_01"
                    className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-xs text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/30"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-xs text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-xs text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/30"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-xs text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-ink-muted/30"
                  />
                </div>
              </div>

              {/* Agree to terms */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  required
                  id="terms-agree"
                  className="w-4 h-4 rounded border-border-hairline text-primary focus:ring-primary/20 bg-canvas mt-0.5"
                />
                <label htmlFor="terms-agree" className="text-xs text-ink-muted cursor-pointer">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </label>
              </div>

              {/* Action */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#cc785c] hover:bg-primary-hover text-[#fff] text-xs font-semibold rounded-lg shadow-xs hover:shadow-sm transition-all focus:ring-3 focus:ring-primary/25 cursor-pointer"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="pt-4 border-t border-border-hairline text-center text-xs text-ink-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setIsSignIn(true);
                }}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Sign sign in instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
