import { Shield } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
}

function AuthTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        border: 'none',
        borderRadius: '14px',
        padding: '0.78rem 1rem',
        background: active ? 'rgba(23, 207, 183, 0.14)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: '14px',
        fontWeight: 600,
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: active ? 'inset 0 0 0 1px var(--accent-teal-border)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label
      style={{
        display: 'block',
        marginBottom: '0.45rem',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 1.3,
      }}
    >
      {children}
    </label>
  );
}

export function LoginPage({ onLogin, onSwitchToSignup }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError('Enter the username you created using lowercase letters, numbers, or underscores.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onLogin(normalizedUsername, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          borderRadius: '28px',
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
          padding: '30px 28px 22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              width: '4.25rem',
              height: '4.25rem',
              borderRadius: '18px',
              background: 'var(--accent-teal-bg)',
              border: '1px solid var(--accent-teal-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-teal)',
              marginBottom: '1rem',
            }}
          >
            <Shield className="h-7 w-7" />
          </div>
          <h1
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            TradeLink
          </h1>
          <p
            style={{
              margin: '0.65rem 0 0',
              color: 'var(--text-muted)',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Secure messaging for trader communities.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '6px',
            borderRadius: '18px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-primary)',
            marginBottom: '1.5rem',
          }}
        >
          <AuthTab label="Sign in" active onClick={() => undefined} />
          <AuthTab label="Create account" active={false} onClick={onSwitchToSignup} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <FieldLabel>Username</FieldLabel>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              minLength={3}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              style={{
                width: '100%',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: 1.4,
                padding: '0.95rem 1rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: error ? '0.9rem' : '1.15rem' }}>
            <FieldLabel>Password</FieldLabel>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: 1.4,
                padding: '0.95rem 1rem',
                outline: 'none',
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                marginBottom: '1rem',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(127, 29, 29, 0.2)',
                padding: '0.9rem 1rem',
                color: '#fca5a5',
                fontSize: '13px',
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              border: '1px solid var(--accent-teal-border)',
              borderRadius: '16px',
              background: 'var(--accent-teal)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              lineHeight: 1,
              padding: '1rem 1rem',
              cursor: isSubmitting ? 'progress' : 'pointer',
              opacity: isSubmitting ? 0.72 : 1,
              boxShadow: '0 16px 36px rgba(23, 207, 183, 0.18)',
            }}
          >
            {isSubmitting ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-primary)',
            color: 'var(--text-label)',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <span>Protected channels, market-grade security.</span>
          <span>v0.1</span>
        </div>
      </div>
    </div>
  );
}
