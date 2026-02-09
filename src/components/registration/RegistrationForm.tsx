// =====================================================================
// Registration Form Component
// =====================================================================
// Purpose: Form for registering to an event
// Used in: Event detail page
// =====================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  available: number;
}

interface RegistrationFormProps {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
}

export function RegistrationForm({
  eventId,
  eventTitle,
  ticketTypes,
}: RegistrationFormProps) {
  const router = useRouter();
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTicketType) {
      setError("Please select a ticket type");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketTypeId: selectedTicketType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      // Redirect to success page with QR code
      router.push(`/my/registrations/${result.data.registrationId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTicketTypes = ticketTypes.filter(
    (tt) => tt.available > 0,
  );

  if (availableTicketTypes.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
        <p className="font-semibold">Event Sold Out</p>
        <p className="text-sm">All tickets for this event have been sold.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Registration Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Ticket Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Ticket Type
        </label>
        <div className="space-y-3">
          {availableTicketTypes.map((ticketType) => (
            <label
              key={ticketType.id}
              className={`block cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedTicketType === ticketType.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="ticketType"
                  value={ticketType.id}
                  checked={selectedTicketType === ticketType.id}
                  onChange={(e) => setSelectedTicketType(e.target.value)}
                  className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {ticketType.name}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(ticketType.price)}
                    </span>
                  </div>
                  {ticketType.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {ticketType.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {ticketType.available} / {ticketType.quantity}{" "}
                    available
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedTicketType}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Processing..." : "Register for Event"}
      </button>

      {/* Info */}
      <p className="text-center text-sm text-gray-600">
        You will receive a QR code ticket via email after registration
      </p>
    </form>
  );
}
