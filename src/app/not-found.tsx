/* eslint-disable @next/next/no-html-link-for-pages */
export default function NotFound() {
  return (
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
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
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
            404 - Page Not Found
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#525252', marginTop: '0.5rem' }}>
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <div style={{ paddingTop: '1.5rem' }}>
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: '#171717',
              color: '#fafafa',
              borderRadius: '0.375rem',
              textDecoration: 'none'
            }}
          >
            <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </a>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#737373', marginTop: '1rem' }}>
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
