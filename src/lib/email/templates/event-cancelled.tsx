/**
 * Event Cancelled Email
 *
 * Sent to all registered attendees when an event is cancelled by the organizer.
 * Provides cancellation details and next steps.
 */

import * as React from "react";
import { BaseEmail, Button, Divider, WarningBox } from "./base";
import { buildEmailUrl } from "../config";
import { formatDateTime } from "@/lib/utils";

export interface EventCancelledEmailProps {
  userName: string;
  eventTitle: string;
  eventSlug: string;
  eventStartDate: string;
  eventLocation: string;
  cancellationReason?: string;
  organizerMessage?: string;
}

export function EventCancelledEmail({
  userName,
  eventTitle,
  eventSlug,
  eventStartDate,
  eventLocation,
  cancellationReason,
  organizerMessage,
}: EventCancelledEmailProps) {
  const myTicketsUrl = buildEmailUrl("/my/registrations");
  const browseEventsUrl = buildEmailUrl("/events");

  return (
    <BaseEmail previewText={`${eventTitle} has been cancelled`}>
      <h2 style={styles.heading}>Event Cancelled ⚠️</h2>

      <p>Hi {userName},</p>

      <p>
        We regret to inform you that <strong>{eventTitle}</strong> has been
        cancelled by the organizer.
      </p>

      <WarningBox>
        <p style={styles.warningText}>
          <strong>Status:</strong> Cancelled
        </p>
        <p style={styles.warningText}>
          <strong>Originally scheduled:</strong>{" "}
          {formatDateTime(new Date(eventStartDate))}
        </p>
      </WarningBox>

      {cancellationReason && (
        <>
          <h3 style={styles.subheading}>Cancellation Reason</h3>
          <p style={styles.reason}>{cancellationReason}</p>
        </>
      )}

      {organizerMessage && (
        <>
          <h3 style={styles.subheading}>Message from the Organizer</h3>
          <div style={styles.messageBox}>
            <p style={styles.message}>{organizerMessage}</p>
          </div>
        </>
      )}

      <Divider />

      <h3 style={styles.subheading}>What This Means for You</h3>

      <ul style={styles.list}>
        <li>Your registration has been automatically cancelled</li>
        <li>
          You will not be charged (or will receive a full refund if already
          paid)
        </li>
        <li>Your QR code ticket is no longer valid</li>
        <li>No further action is required from you</li>
      </ul>

      <Divider />

      <h3 style={styles.subheading}>Explore Other Events</h3>

      <p>
        We're sorry for the inconvenience. Check out other exciting events that
        might interest you!
      </p>

      <div style={styles.buttonGroup}>
        <Button href={browseEventsUrl} variant="primary">
          Browse Events
        </Button>
        <Button href={myTicketsUrl} variant="secondary">
          View My Tickets
        </Button>
      </div>

      <p style={styles.footer}>
        If you have any questions or concerns, please don't hesitate to contact
        our support team.
        <br />
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
    color: "#dc2626",
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
  warningText: {
    margin: "4px 0",
    color: "#92400e",
  },
  reason: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "16px",
    color: "#374151",
    fontStyle: "italic" as const,
  },
  messageBox: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    padding: "16px",
  },
  message: {
    color: "#1e40af",
    margin: 0,
  },
  list: {
    margin: "12px 0",
    paddingLeft: "24px",
    color: "#374151",
    lineHeight: "1.8",
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
