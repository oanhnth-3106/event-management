"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EventActionsProps {
  eventId: string;
  status: string;
}

export default function EventActions({ eventId, status }: EventActionsProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handlePublish = async () => {
    if (
      !confirm(
        "Are you sure you want to publish this event? It will become visible to attendees.",
      )
    ) {
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(`/api/events/${eventId}/publish`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to publish event");
      }

      alert("Event published successfully!");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to publish event");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel event");
      }

      alert(
        "Event cancelled successfully. All registered attendees will be notified.",
      );
      setShowCancelModal(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to cancel event");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSendReminder = async () => {
    if (!confirm("Send reminder emails to all registered attendees?")) {
      return;
    }

    setIsSendingReminder(true);
    try {
      const response = await fetch(`/api/events/${eventId}/remind`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send reminders");
      }

      alert(`Reminder sent to ${result.data?.recipientCount || 0} attendees!`);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to send reminders",
      );
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        {status === "draft" && (
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : "Publish Event"}
          </button>
        )}

        {status === "published" && (
          <button
            onClick={handleSendReminder}
            disabled={isSendingReminder}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSendingReminder ? "Sending..." : "Send Reminder"}
          </button>
        )}

        {status === "published" && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Cancel Event
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
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
              <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
                Cancel Event
              </h3>
              <p className="mt-2 text-center text-sm text-gray-600">
                Are you sure you want to cancel this event? All registered
                attendees will be notified and their registrations will be
                cancelled. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Event
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
