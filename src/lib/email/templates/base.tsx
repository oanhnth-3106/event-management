/**
 * Base Email Template
 *
 * Provides consistent layout and styling for all email templates.
 * Uses React Email components for type-safe email rendering.
 */

import * as React from "react";

export interface BaseEmailProps {
  previewText?: string;
  children: React.ReactNode;
}

/**
 * Base email layout with consistent styling
 */
export function BaseEmail({ previewText, children }: BaseEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {previewText && <meta name="description" content={previewText} />}
      </head>
      <body style={styles.body}>
        <table style={styles.container} role="presentation">
          <tbody>
            <tr>
              <td style={styles.cell}>
                {/* Header */}
                <Header />

                {/* Content */}
                <div style={styles.content}>{children}</div>

                {/* Footer */}
                <Footer />
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

/**
 * Email header with logo
 */
function Header() {
  return (
    <div style={styles.header}>
      <h1 style={styles.logo}>EventHub</h1>
    </div>
  );
}

/**
 * Email footer with links
 */
function Footer() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div style={styles.footer}>
      <p style={styles.footerText}>
        © {new Date().getFullYear()} EventHub. All rights reserved.
      </p>
      <p style={styles.footerLinks}>
        <a href={`${appUrl}/events`} style={styles.footerLink}>
          Browse Events
        </a>
        {" • "}
        <a href={`${appUrl}/my/registrations`} style={styles.footerLink}>
          My Tickets
        </a>
        {" • "}
        <a href={`${appUrl}/support`} style={styles.footerLink}>
          Support
        </a>
      </p>
      <p style={styles.footerText}>
        This email was sent to you because you have an account with EventHub.
      </p>
    </div>
  );
}

/**
 * Reusable button component
 */
export function Button({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const buttonStyle =
    variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary;

  return (
    <table role="presentation" style={styles.buttonContainer}>
      <tbody>
        <tr>
          <td>
            <a
              href={href}
              style={buttonStyle}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Section divider
 */
export function Divider() {
  return <hr style={styles.divider} />;
}

/**
 * Info box for important information
 */
export function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={styles.infoBox}>{children}</div>;
}

/**
 * Warning box for alerts
 */
export function WarningBox({ children }: { children: React.ReactNode }) {
  return <div style={styles.warningBox}>{children}</div>;
}

/**
 * Email styles (inline CSS for email compatibility)
 */
const styles = {
  body: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: "#f3f4f6",
    margin: 0,
    padding: 0,
  },
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
  },
  cell: {
    padding: "0",
  },
  header: {
    backgroundColor: "#2563eb",
    padding: "24px",
    textAlign: "center" as const,
  },
  logo: {
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: "bold" as const,
    margin: 0,
  },
  content: {
    padding: "32px 24px",
    color: "#1f2937",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  footer: {
    backgroundColor: "#f9fafb",
    padding: "24px",
    textAlign: "center" as const,
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    color: "#6b7280",
    fontSize: "14px",
    margin: "8px 0",
  },
  footerLinks: {
    margin: "12px 0",
  },
  footerLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "14px",
  },
  buttonContainer: {
    margin: "24px 0",
  },
  buttonPrimary: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "600" as const,
    display: "inline-block",
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
    color: "#2563eb",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "600" as const,
    display: "inline-block",
    border: "2px solid #2563eb",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "24px 0",
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    padding: "16px",
    margin: "16px 0",
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "6px",
    padding: "16px",
    margin: "16px 0",
  },
} as const;
