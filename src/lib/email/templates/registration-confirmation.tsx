/**
 * Registration Confirmation Email
 *
 * Sent when a user successfully registers for an event.
 * Includes event details, ticket information, and QR code access link.
 */

import * as React from "react";
import { BaseEmail, Button, Divider, InfoBox } from "./base";
import { buildEmailUrl } from "../config";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

export interface RegistrationConfirmationEmailProps {
  userName: string;
  eventTitle: string;
  eventSlug: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  ticketType: string;
  ticketPrice: number;
  registrationId: string;
  confirmationNumber: string;
}

export function RegistrationConfirmationEmail({
  userName,
  eventTitle,
  eventSlug,
  eventStartDate,
  eventEndDate,
  eventLocation,
  ticketType,
  ticketPrice,
  registrationId,
  confirmationNumber,
}: RegistrationConfirmationEmailProps) {
  const ticketUrl = buildEmailUrl(`/my/registrations/${registrationId}`);
  const eventUrl = buildEmailUrl(`/events/${eventSlug}`);

  return (
    <BaseEmail previewText={`Your ticket for ${eventTitle}`}>
      <h2 style={styles.heading}>Registration Confirmed! 🎉</h2>

      <p>Hi {userName},</p>

      <p>
        Great news! Your registration for <strong>{eventTitle}</strong> has been
        confirmed.
      </p>

      <InfoBox>
        <p style={styles.infoTitle}>
          <strong>Confirmation Number:</strong>
        </p>
        <p style={styles.confirmationNumber}>{confirmationNumber}</p>
      </InfoBox>

      <Divider />

      <h3 style={styles.subheading}>Event Details</h3>

      <table style={styles.detailsTable}>
        <tbody>
          <tr>
            <td style={styles.detailLabel}>Event:</td>
            <td style={styles.detailValue}>{eventTitle}</td>
          </tr>
          <tr>
            <td style={styles.detailLabel}>Date & Time:</td>
            <td style={styles.detailValue}>
              {formatDateTime(new Date(eventStartDate))}
              {eventEndDate && eventEndDate !== eventStartDate && (
                <> to {formatDateTime(new Date(eventEndDate))}</>
              )}
            </td>
          </tr>
          <tr>
            <td style={styles.detailLabel}>Location:</td>
            <td style={styles.detailValue}>{eventLocation}</td>
          </tr>
          <tr>
            <td style={styles.detailLabel}>Ticket Type:</td>
            <td style={styles.detailValue}>{ticketType}</td>
          </tr>
          <tr>
            <td style={styles.detailLabel}>Price:</td>
            <td style={styles.detailValue}>{formatCurrency(ticketPrice)}</td>
          </tr>
        </tbody>
      </table>

      <Divider />

      <h3 style={styles.subheading}>Your Ticket QR Code</h3>

      <p>
        Your unique QR code ticket is ready! You'll need to present this QR code
        at the event entrance for check-in.
      </p>

      <Button href={ticketUrl} variant="primary">
        View My Ticket & QR Code
      </Button>

      <p style={styles.note}>
        💡 <strong>Pro tip:</strong> Save your ticket offline or take a
        screenshot in case you don't have internet access at the event.
      </p>

      <Divider />

      <h3 style={styles.subheading}>What's Next?</h3>

      <ul style={styles.list}>
        <li>You'll receive a reminder email 24 hours before the event</li>
        <li>Another reminder will be sent 2 hours before the event starts</li>
        <li>Bring your phone or a printed copy of your QR code</li>
        <li>Arrive a few minutes early for a smooth check-in</li>
      </ul>

      <p>
        If you have any questions or need to make changes to your registration,
        please contact the event organizer or our support team.
      </p>

      <div style={styles.buttonGroup}>
        <Button href={ticketUrl} variant="primary">
          View My Ticket
        </Button>
        <Button href={eventUrl} variant="secondary">
          View Event Details
        </Button>
      </div>

      <p style={styles.footer}>
        We're excited to see you at the event!
        <br />
        The EventHub Team
      </p>
    </BaseEmail>
  );
}

const styles = {
  heading: {
    fontSize: "24px",
    fontWeight: "bold" as const,
    color: "#1f2937",
    marginTop: 0,
    marginBottom: "16px",
  },
  subheading: {
    fontSize: "18px",
    fontWeight: "600" as const,
    color: "#1f2937",
    marginTop: "24px",
    marginBottom: "12px",
  },
  infoTitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    color: "#374151",
  },
  confirmationNumber: {
    fontSize: "20px",
    fontWeight: "bold" as const,
    color: "#2563eb",
    fontFamily: "monospace",
    margin: 0,
  },
  detailsTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  detailLabel: {
    padding: "8px 12px 8px 0",
    fontWeight: "600" as const,
    color: "#6b7280",
    verticalAlign: "top" as const,
    width: "35%",
  },
  detailValue: {
    padding: "8px 0",
    color: "#1f2937",
  },
  note: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
    fontSize: "14px",
    color: "#374151",
    margin: "16px 0",
  },
  list: {
    margin: "12px 0",
    paddingLeft: "24px",
    color: "#374151",
  },
  buttonGroup: {
    margin: "24px 0",
  },
  footer: {
    marginTop: "32px",
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center" as const,
  },
} as const;
