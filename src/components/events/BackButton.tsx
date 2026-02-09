"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed bottom-8 left-8 z-50 flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 hover:bg-gray-50"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5 text-gray-700" />
      <span className="font-medium text-gray-700">Back</span>
    </button>
  );
}
