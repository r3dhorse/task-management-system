'use client'

/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #fafafa, #f5f5f5, #e5e5e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '28rem',
            border: '0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '0.75rem',
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
              <div style={{
                margin: '0 auto',
                width: '4rem',
                height: '4rem',
                backgroundColor: '#fee2e2',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <svg style={{ width: '2rem', height: '2rem', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#171717' }}>
                Something went wrong!
              </h1>
              <p style={{ fontSize: '1rem', color: '#525252', marginTop: '0.5rem' }}>
                An unexpected error has occurred.
              </p>
            </div>

            <div style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => reset()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#171717',
                  color: '#fafafa',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#171717',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  border: '1px solid #e5e5e5'
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
