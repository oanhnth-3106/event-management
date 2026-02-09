// =====================================================================
// QR Code Display Component
// =====================================================================
// Purpose: Display QR code for ticket
// Used in: My tickets page, Registration confirmation page
// =====================================================================

"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

interface QRCodeDisplayProps {
  qrData: string;
  attendeeName: string;
  eventTitle: string;
  ticketType: string;
  size?: number;
}

export function QRCodeDisplay({
  qrData,
  attendeeName,
  eventTitle,
  ticketType,
  size = 300,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrRef.current) return;

    // Initialize QR code
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data: qrData,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: "H",
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 5,
      },
      dotsOptions: {
        color: "#1f2937",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        color: "#2563eb",
        type: "extra-rounded",
      },
      cornersDotOptions: {
        color: "#2563eb",
        type: "dot",
      },
    });

    // Clear previous QR code
    qrRef.current.innerHTML = "";

    // Append QR code to DOM
    qrCode.current.append(qrRef.current);
  }, [qrData, size]);

  const handleDownload = () => {
    if (qrCode.current) {
      qrCode.current.download({
        name: `ticket-${eventTitle.replace(/\s+/g, "-").toLowerCase()}`,
        extension: "png",
      });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* QR Code */}
      <div className="flex justify-center">
        <div ref={qrRef} />
      </div>

      {/* Ticket Info */}
      <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Event</p>
          <p className="text-lg font-semibold text-gray-900">{eventTitle}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Attendee</p>
          <p className="text-gray-900">{attendeeName}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Ticket Type</p>
          <p className="text-gray-900">{ticketType}</p>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Download QR Code
      </button>

      {/* Instructions */}
      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">
          Check-in Instructions
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>Show this QR code at the event entrance</li>
          <li>Check-in opens 2 hours before event start</li>
          <li>Keep this ticket safe until after check-in</li>
        </ul>
      </div>
    </div>
  );
}
