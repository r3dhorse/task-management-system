import { NextPage } from 'next';
import Link from 'next/link';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: 'linear-gradient(to bottom right, #f5f5f5, #e5e5e5, #d4d4d4)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        padding: '2rem',
        borderRadius: '0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#171717', marginBottom: '0.5rem' }}>
          {statusCode || 'Error'}
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#525252', marginBottom: '1.5rem' }}>
          {statusCode === 404
            ? 'The page you are looking for does not exist.'
            : 'An unexpected error has occurred.'}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#171717',
            color: '#fafafa',
            borderRadius: '0.375rem',
            textDecoration: 'none'
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
