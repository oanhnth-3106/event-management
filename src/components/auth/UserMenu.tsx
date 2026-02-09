// =====================================================================
// User Menu Component
// =====================================================================
// Purpose: Dropdown menu for authenticated users
// Shows: User info, navigation links, sign out
// =====================================================================

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

interface UserMenuProps {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
}

export function UserMenu({ user, profile }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    // Force full page reload to clear all state
    window.location.href = "/";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-full bg-blue-600 p-1 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700">
          {getInitials(profile.full_name)}
        </div>
        <svg
          className={`mr-2 h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {/* User Info */}
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
                {profile.full_name}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <p className="mt-1 text-xs capitalize text-gray-600">
                {profile.role}
              </p>
            </div>

            {/* Navigation Links */}
            <div className="py-1">
              <Link
                href="/my/tickets"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                My Tickets
              </Link>

              {(profile.role === "organizer" || profile.role === "admin") && (
                <>
                  <Link
                    href="/organizer/events"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    My Events
                  </Link>
                  <Link
                    href="/organizer/create"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsOpen(false)}
                  >
                    Create Event
                  </Link>
                </>
              )}

              {(profile.role === "staff" ||
                profile.role === "organizer" ||
                profile.role === "admin") && (
                <Link
                  href="/staff/checkin"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Event Check-in
                </Link>
              )}

              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
            </div>

            {/* Sign Out */}
            <div className="border-t border-gray-200 py-1">
              <button
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
