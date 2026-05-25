import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
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
      <div style={{ marginBottom: '1.5rem', fontSize: '4rem', fontWeight: 800, color: '#c9a84c' }}>
        404
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        Page Not Found
      </h1>
      <p style={{ color: '#94a3b8', maxWidth: '360px', marginBottom: '2rem', lineHeight: 1.6 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          backgroundColor: '#c9a84c',
          color: '#0f172a',
          padding: '0.6rem 1.5rem',
          borderRadius: '0.5rem',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Return Home
      </Link>
    </div>
  );
}
