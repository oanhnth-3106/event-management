"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface Event {
  id: string;
  title: string;
  start_date: string;
  status: string;
}

interface QRScannerProps {
  events: Event[];
}

export function QRScanner({ events }: QRScannerProps) {
  console.log("[QRScanner] Component rendered with events:", events.length);

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "error" | "info";
    message: string;
    details?: any;
  } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false); // Prevent duplicate scans

  console.log("[QRScanner] Current state:", { selectedEventId, isScanning });

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    console.log("[QRScanner] Starting scanner...", { selectedEventId });

    if (!selectedEventId) {
      setScanResult({
        type: "error",
        message: "Please select an event first",
      });
      return;
    }

    try {
      console.log("[QRScanner] Initializing Html5Qrcode...");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      console.log("[QRScanner] Starting camera...");
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10, // Lower FPS can be more stable
          qrbox: function (viewfinderWidth, viewfinderHeight) {
            // Square QR box, 70% of the smaller edge
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return {
              width: qrboxSize,
              height: qrboxSize,
            };
          },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanError,
      );

      console.log("[QRScanner] Scanner started successfully!");
      setIsScanning(true);
      setScanResult({
        type: "info",
        message: "Scanner started. Point camera at QR code.",
      });
    } catch (err) {
      console.error("[QRScanner] Failed to start scanner:", err);
      setScanResult({
        type: "error",
        message: "Failed to start camera. Please check permissions.",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
      setScanResult(null);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Prevent processing same QR multiple times
    if (isProcessingRef.current) {
      console.log("[QRScanner] Already processing a scan, ignoring...");
      return;
    }

    isProcessingRef.current = true;
    console.log("[QRScanner] Scanned QR code:", decodedText);

    try {
      const qrData = JSON.parse(decodedText);
      console.log("[QRScanner] Parsed QR data:", qrData);

      if (!qrData.registrationId || !qrData.eventId) {
        console.error("[QRScanner] Invalid QR structure:", qrData);
        setScanResult({
          type: "error",
          message: "Invalid QR code format",
        });
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanResult(null);
        }, 2000);
        return;
      }

      if (qrData.eventId !== selectedEventId) {
        const event = events.find((e) => e.id === selectedEventId);
        console.warn("[QRScanner] Event mismatch");
        setScanResult({
          type: "error",
          message: "This ticket is for a different event",
          details: { selectedEvent: event?.title },
        });
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanResult(null);
        }, 2000);
        return;
      }

      console.log("[QRScanner] Calling check-in API...");

      const response = await fetch("/api/staff/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: qrData.registrationId,
          eventId: selectedEventId,
        }),
      });

      const result = await response.json();
      console.log("[QRScanner] API response:", {
        status: response.status,
        result,
      });

      if (response.ok) {
        setScanResult({
          type: "success",
          message: "✓ Check-in successful!",
          details: result.data,
        });

        setRecentCheckins((prev) => [result.data, ...prev.slice(0, 9)]);

        // Continue scanning after 2 seconds
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanResult(null);
        }, 2000);
      } else {
        console.error("[QRScanner] Check-in failed:", result);
        setScanResult({
          type: "error",
          message: result.error || "Check-in failed",
        });
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanResult(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Scan processing error:", err);
      setScanResult({
        type: "error",
        message: "Failed to process QR code",
      });
      setTimeout(() => {
        isProcessingRef.current = false;
        setScanResult(null);
      }, 2000);
    }
  };

  const onScanError = (errorMessage: string) => {
    if (Math.random() < 0.01) {
      console.log("[QRScanner] Scan error:", errorMessage);
    }
  };

  const handleManualTest = async () => {
    const qrJson = prompt("Paste QR JSON data here:");
    if (!qrJson) return;

    console.log("[QRScanner] Manual test with:", qrJson);
    await onScanSuccess(qrJson);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          disabled={isScanning}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">-- Choose an event --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} - {new Date(event.start_date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg bg-white shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QR Scanner</h3>
          <div className="flex gap-2">
            <button
              onClick={handleManualTest}
              disabled={!selectedEventId}
              className="rounded-md px-4 py-2 font-semibold text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Manual Test
            </button>
            <button
              onClick={() => {
                console.log("[QRScanner] Start button clicked!");
                startScanner();
              }}
              disabled={!selectedEventId}
              className={`rounded-md px-6 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isScanning
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              }`}
            >
              {isScanning ? "Stop Scanner" : "Start Scanner"}
            </button>
          </div>
        </div>

        <div
          id="qr-reader"
          className="w-full rounded-lg overflow-hidden bg-black"
        ></div>

        {scanResult && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              scanResult.type === "success"
                ? "bg-green-50 border border-green-200"
                : scanResult.type === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-blue-50 border border-blue-200"
            }`}
          >
            <p
              className={`font-semibold ${
                scanResult.type === "success"
                  ? "text-green-900"
                  : scanResult.type === "error"
                    ? "text-red-900"
                    : "text-blue-900"
              }`}
            >
              {scanResult.message}
            </p>
            {scanResult.details && (
              <div className="mt-2 text-sm">
                {scanResult.details.attendeeName && (
                  <p className="text-gray-700">
                    Attendee:{" "}
                    <span className="font-medium">
                      {scanResult.details.attendeeName}
                    </span>
                  </p>
                )}
                {scanResult.details.ticketType && (
                  <p className="text-gray-700">
                    Ticket:{" "}
                    <span className="font-medium">
                      {scanResult.details.ticketType}
                    </span>
                  </p>
                )}
                {scanResult.details.selectedEvent && (
                  <p className="text-gray-700">
                    Selected Event:{" "}
                    <span className="font-medium">
                      {scanResult.details.selectedEvent}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scanning Tips */}
        {isScanning && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="font-semibold text-yellow-900 mb-2">
              📱 Scanning Tips:
            </p>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Hold camera 10-20cm from QR code</li>
              <li>• Ensure good lighting (avoid shadows)</li>
              <li>• Keep QR code flat and steady</li>
              <li>• If scanning from screen, increase brightness</li>
              <li>• Try printing QR code for better results</li>
            </ul>
            <p className="text-sm text-yellow-800 mt-2">
              💡 <strong>Not working?</strong> Use the "Manual Test" button
              instead
            </p>
          </div>
        )}
      </div>

      {recentCheckins.length > 0 && (
        <div className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Check-ins
          </h3>
          <div className="space-y-3">
            {recentCheckins.map((checkin, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {checkin.attendeeName || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {checkin.ticketType || "N/A"}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(
                    checkin.checkedInAt || Date.now(),
                  ).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
