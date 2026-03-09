'use client';

/**
 * Global Error Boundary for Next.js App Router
 * Catches unhandled errors and displays a user-friendly recovery UI.
 * Styled to match Clarkson University branding.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for debugging (server-side in production)
  console.error('[GlobalErrorBoundary]', error);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{
        backgroundColor: '#092E28',
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
      }}
    >
      <div
        className="text-center max-w-md p-8 rounded-lg"
        style={{
          backgroundColor: 'rgba(9, 46, 40, 0.8)',
          border: '1px solid rgba(250, 201, 34, 0.15)',
        }}
      >
        {/* Error icon */}
        <div
          className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(231, 76, 60, 0.15)' }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="#E74C3C"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: '#FFFFFE' }}
        >
          Something went wrong
        </h1>

        <p
          className="mb-6 text-sm leading-relaxed"
          style={{ color: 'rgba(255, 255, 254, 0.7)' }}
        >
          The application encountered an unexpected error. This has been logged
          and we'll look into it. Please try again.
        </p>

        <button
          onClick={reset}
          className="px-6 py-3 text-sm font-semibold rounded transition-all duration-200 hover:transform hover:-translate-y-0.5"
          style={{
            backgroundColor: '#FAC922',
            color: '#092E28',
            boxShadow: '0 4px 12px rgba(250, 201, 34, 0.25)',
          }}
        >
          Try Again
        </button>

        <p
          className="mt-6 text-xs"
          style={{ color: 'rgba(255, 255, 254, 0.4)' }}
        >
          If this keeps happening, try refreshing the page or contact support.
        </p>
      </div>
    </div>
  );
}
