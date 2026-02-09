// =====================================================================
// Reset Password Page
// =====================================================================
// Purpose: Set new password (accessed via email link)
// Route: /auth/reset-password
// =====================================================================

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to Login Link */}
        <div className="mb-8 text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Sign In
          </Link>
        </div>

        {/* Reset Password Form */}
        <ResetPasswordForm />
      </div>
    </div>
  );
}
