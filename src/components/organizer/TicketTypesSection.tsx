// =====================================================================
// Organizer: Ticket Types Section Component
// =====================================================================
"use client";

import { useState } from "react";
import AddTicketTypeModal from "./AddTicketTypeModal";
import EditTicketTypeModal from "./EditTicketTypeModal";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  available: number;
}

interface TicketTypesSectionProps {
  eventId: string;
  ticketTypes: TicketType[];
}

export default function TicketTypesSection({
  eventId,
  ticketTypes,
}: TicketTypesSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);

  const handleEditClick = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Ticket Types</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Ticket Type
          </button>
        </div>

        {ticketTypes.length > 0 ? (
          <div className="space-y-4">
            {ticketTypes.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-md border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{ticket.name}</h3>
                    {ticket.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {ticket.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        ${ticket.price.toFixed(2)}
                      </span>
                      <span>•</span>
                      <span>
                        {ticket.quantity - ticket.available} / {ticket.quantity}{" "}
                        sold
                      </span>
                      <span>•</span>
                      <span>{ticket.available} available</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClick(ticket)}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No ticket types
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a ticket type.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Ticket Type
              </button>
            </div>
          </div>
        )}
      </div>

      <AddTicketTypeModal
        eventId={eventId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditTicketTypeModal
        eventId={eventId}
        ticketType={selectedTicket}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTicket(null);
        }}
      />
    </>
  );
}
