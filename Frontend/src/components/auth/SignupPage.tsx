import { Shield } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SignupPageProps {
  onSignup: (username: string, password: string, name?: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSignup, onSwitchToLogin }: SignupPageProps) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError('Username must be 3-24 characters using lowercase letters, numbers, or underscores.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSignup(normalizedUsername, password, name || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
        <div className="relative hidden flex-1 overflow-hidden border-r border-zinc-800 xl:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.05]" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
          <div className="relative flex w-full flex-col justify-between px-14 py-14">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.28),rgba(37,99,235,0.28))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="text-lg font-semibold tracking-[0.22em] text-white">TL</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-300/80">TradeLink</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Secure messaging for trader communities</h1>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="max-w-lg text-base leading-8 text-zinc-300">
                Create a handle-based identity built for public spaces, direct messages, and invite-only group conversations.
              </p>

              <div className="mt-10 grid gap-4">
                {[
                  ['Handle-first identity', 'Your username is the main identity across spaces, DMs, group chat, and profile activity.'],
                  ['Private by context', 'Every conversation explains who can read, who can reply, and what metadata stays visible.'],
                  ['Market context on demand', 'Mention supported tickers in chat and keep stock detail secondary to conversation.'],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <p className="text-sm font-medium text-zinc-100">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />
              Private groups, public spaces, direct messages, and stored market context in one calm interface.
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-zinc-950 px-6 py-10 xl:max-w-[520px]">
          <div className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-900 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-8 flex items-center gap-4 xl:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.24),rgba(37,99,235,0.28))]">
                <span className="font-semibold tracking-[0.2em] text-white">TL</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">TradeLink</h1>
                <p className="text-sm text-zinc-500">Secure messaging for trader communities</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Join TradeLink</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Create your TradeLink username</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Set up the handle you will use across spaces, direct messages, private groups, and market-linked chat.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-zinc-200">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                  placeholder="Choose a username"
                  minLength={3}
                  maxLength={24}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <p className="text-xs leading-5 text-zinc-500">Use 3-24 lowercase letters, numbers, or underscores. Normalization happens when you submit, not while you type.</p>
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-zinc-200">
                  Display name <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                  placeholder="How your name appears in chat"
                />
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-zinc-200">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 transition-all duration-150 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/70"
                  placeholder="Create a password"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-900/80 bg-red-950/30 px-4 py-3.5">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3.5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(8,145,178,0.22)] transition-all duration-150 hover:bg-cyan-500 active:translate-y-px disabled:bg-zinc-700 disabled:shadow-none"
              >
                <Shield className="h-4 w-4" />
                <span>{isSubmitting ? 'Creating Username...' : 'Create Account'}</span>
              </button>
            </form>

            <div className="mt-8 border-t border-zinc-800 pt-5 text-sm text-zinc-500">
              <span>Already have an account? </span>
              <button onClick={onSwitchToLogin} className="font-medium text-cyan-300 transition-colors hover:text-cyan-200">
                Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
