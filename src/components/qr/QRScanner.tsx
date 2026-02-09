// =====================================================================
// QR Scanner Component
// =====================================================================
// Purpose: Scan QR codes for check-in
// Used in: Staff check-in interface
// =====================================================================

"use client";

import { useState, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface QRScannerProps {
  eventId: string;
  onScanSuccess: (qrData: string) => void;
  onScanError: (error: string) => void;
}

export function QRScanner({
  eventId,
  onScanSuccess,
  onScanError,
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setErrorMessage(null);
      setIsScanning(true);

      const codeReader = new BrowserMultiFormatReader();

      // Get video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(videoStream);

      // Find video element
      const videoElement = document.getElementById(
        "qr-video",
      ) as HTMLVideoElement;

      if (!videoElement) {
        throw new Error("Video element not found");
      }

      // Start scanning
      await codeReader.decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, error) => {
          if (result) {
            const qrData = result.getText();
            onScanSuccess(qrData);
            stopScanning();
          }

          // Ignore errors (no QR code in frame)
          if (error && !(error.name === "NotFoundException")) {
            console.error("QR scan error:", error);
          }
        },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start camera";
      setErrorMessage(message);
      onScanError(message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      {isScanning && (
        <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-blue-600 bg-black">
          <video
            id="qr-video"
            className="h-full w-full object-cover"
            autoPlay
            playsInline
          />
          <div className="absolute inset-0 border-4 border-white opacity-50" />
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 border-4 border-blue-600" />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Camera Error</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="flex items-center rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex items-center rounded-md bg-red-600 px-6 py-3 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Stop Scanner
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">Scanning Tips</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
          <li>Hold the QR code steady within the frame</li>
          <li>Ensure good lighting for best results</li>
          <li>QR code will be scanned automatically</li>
        </ul>
      </div>
    </div>
  );
}
