'use client';

// global-error.tsx must include its own <html> and <body> tags
// (it replaces the root layout when a top-level error occurs)
// IMPORTANT: Do NOT import Html from next/document — use lowercase html tag

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <main>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Critical Application Error
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {error.message || 'A critical error occurred. Our team has been notified.'}
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#c9a84c',
              color: '#0f172a',
              padding: '0.6rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
