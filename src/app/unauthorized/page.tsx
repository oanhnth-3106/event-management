// =====================================================================
// Unauthorized Page
// =====================================================================
// Purpose: Show when user lacks required permissions
// Route: /unauthorized
// =====================================================================

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
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

          {/* Message */}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Access Denied
          </h1>
          <p className="mb-6 text-gray-600">
            You don't have permission to access this page. Please contact an
            administrator if you believe this is an error.
          </p>

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <Link
              href="/"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to Home
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
