/**
 * Event Reminder Email
 *
 * Sent as automated reminders before events (24h and 2h).
 * Reminds attendees about the upcoming event with all essential details.
 */

import * as React from "react";
import { BaseEmail, Button, Divider, InfoBox } from "./base";
import { buildEmailUrl } from "../config";
import { formatDateTime, getTimeUntilEvent } from "@/lib/utils";

export interface EventReminderEmailProps {
  userName: string;
  eventTitle: string;
  eventSlug: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  ticketType: string;
  registrationId: string;
  reminderType: "24h" | "2h";
}

export function EventReminderEmail({
  userName,
  eventTitle,
  eventSlug,
  eventStartDate,
  eventEndDate,
  eventLocation,
  ticketType,
  registrationId,
  reminderType,
}: EventReminderEmailProps) {
  const ticketUrl = buildEmailUrl(`/my/registrations/${registrationId}`);
  const eventUrl = buildEmailUrl(`/events/${eventSlug}`);

  const timeUntil = getTimeUntilEvent(eventStartDate);
  const emoji = reminderType === "24h" ? "📅" : "⏰";
  const urgency = reminderType === "24h" ? "tomorrow" : "soon";

  return (
    <BaseEmail previewText={`Reminder: ${eventTitle} is ${urgency}!`}>
      <h2 style={styles.heading}>
        {emoji} Event Reminder:{" "}
        {urgency === "soon" ? "Starting Soon!" : "Tomorrow!"}
      </h2>

      <p>Hi {userName},</p>

      <p>
        This is a friendly reminder that <strong>{eventTitle}</strong> is
        happening {urgency}!
      </p>

      <InfoBox>
        <p style={styles.timeRemaining}>
          <strong>Starts in: {timeUntil}</strong>
        </p>
        <p style={styles.startTime}>
          {formatDateTime(new Date(eventStartDate))}
        </p>
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
            <td style={styles.detailLabel}>Your Ticket:</td>
            <td style={styles.detailValue}>{ticketType}</td>
          </tr>
        </tbody>
      </table>

      <Divider />

      <h3 style={styles.subheading}>Check-In Instructions</h3>

      <ol style={styles.list}>
        <li>
          <strong>Access your QR code ticket:</strong> Click the button below or
          visit your tickets page
        </li>
        <li>
          <strong>Save it offline:</strong> Take a screenshot or save the QR
          code image
        </li>
        <li>
          <strong>Arrive early:</strong> Give yourself a few extra minutes for
          check-in
        </li>
        <li>
          <strong>Present your QR code:</strong> Show it at the entrance for
          quick check-in
        </li>
      </ol>

      <Button href={ticketUrl} variant="primary">
        View My QR Code Ticket
      </Button>

      {reminderType === "24h" && (
        <p style={styles.note}>
          💡 <strong>Tip:</strong> Plan your route and check traffic conditions.
          You'll receive one more reminder 2 hours before the event.
        </p>
      )}

      {reminderType === "2h" && (
        <p style={styles.alertNote}>
          ⚠️ <strong>Important:</strong> The event is starting in just 2 hours!
          Make sure you have your QR code ready and head to the venue soon.
        </p>
      )}

      <Divider />

      <h3 style={styles.subheading}>Need Help?</h3>

      <p>
        If you can't make it, you can cancel your registration from your tickets
        page. For any other questions, please contact the event organizer or our
        support team.
      </p>

      <div style={styles.buttonGroup}>
        <Button href={ticketUrl} variant="primary">
          View My Ticket
        </Button>
        <Button href={eventUrl} variant="secondary">
          Event Details
        </Button>
      </div>

      <p style={styles.footer}>
        See you at the event!
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
  timeRemaining: {
    fontSize: "18px",
    color: "#dc2626",
    margin: "0 0 8px 0",
  },
  startTime: {
    fontSize: "16px",
    color: "#374151",
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
  list: {
    margin: "12px 0",
    paddingLeft: "24px",
    color: "#374151",
    lineHeight: "1.8",
  },
  note: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    padding: "12px",
    fontSize: "14px",
    color: "#1e40af",
    margin: "16px 0",
  },
  alertNote: {
    backgroundColor: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: "6px",
    padding: "12px",
    fontSize: "14px",
    color: "#92400e",
    margin: "16px 0",
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
