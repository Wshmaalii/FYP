import { Lock } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
}

export function LoginPage({ onLogin, onSwitchToSignup }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-black items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center">
            <span className="text-white">TL</span>
          </div>
          <div>
            <h1 className="text-zinc-100 text-xl">TradeLink</h1>
            <p className="text-zinc-500 text-sm">Secure Trading Workspace</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-zinc-100 text-lg mb-1">Log In</h2>
          <p className="text-zinc-500 text-sm">Access your trading channels and watchlists.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-sm mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950 border border-red-900 rounded">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 text-white rounded transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? 'Logging In...' : 'Log In'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800 text-sm text-zinc-500">
          <span>Need an account? </span>
          <button onClick={onSwitchToSignup} className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
