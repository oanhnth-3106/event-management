import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @example
 * cn('px-2 py-1', condition && 'bg-blue-500', 'px-4') // => 'py-1 bg-blue-500 px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with locale support
 * 
 * @param amount - Amount in decimal (e.g., 99.99)
 * @param currency - Currency code (default: 'VND')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(50000) // => '50,000 VND'
 * formatCurrency(1000000) // => '1,000,000 VND'
 * formatCurrency(0) // => 'Free'
 */
export function formatCurrency(amount: number, currency: string = 'VND'): string {
  if (amount === 0) return 'Free';
  
  // For VND, format without decimal places and with comma separator
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' VND';
  }
  
  // For other currencies, use standard formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date with locale support
 * 
 * @param date - ISO 8601 date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2026-06-15T09:00:00Z') // => 'Jun 15, 2026'
 * formatDate(date, { dateStyle: 'full' }) // => 'Monday, June 15, 2026'
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Format date and time
 * 
 * @param date - ISO 8601 date string or Date object
 * @returns Formatted date and time string
 * 
 * @example
 * formatDateTime('2026-06-15T09:00:00Z') // => 'Jun 15, 2026 at 9:00 AM'
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateObj);
}

/**
 * Generate slug from title
 * 
 * @param title - Event title or any string
 * @returns URL-friendly slug
 * 
 * @example
 * slugify('Tech Conference 2026') // => 'tech-conference-2026'
 * slugify('Hello, World!') // => 'hello-world'
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Check if event is upcoming
 * 
 * @param startDate - Event start date (ISO 8601 string)
 * @returns True if event hasn't started yet
 */
export function isUpcoming(startDate: string): boolean {
  return new Date(startDate) > new Date();
}

/**
 * Check if event is past
 * 
 * @param endDate - Event end date (ISO 8601 string)
 * @returns True if event has ended
 */
export function isPast(endDate: string): boolean {
  return new Date(endDate) < new Date();
}

/**
 * Check if event is currently active (happening now)
 * 
 * @param startDate - Event start date (ISO 8601 string)
 * @param endDate - Event end date (ISO 8601 string)
 * @returns True if event is currently in progress
 */
export function isActive(startDate: string, endDate: string): boolean {
  const now = new Date();
  return new Date(startDate) <= now && now <= new Date(endDate);
}

/**
 * Calculate time until event starts
 * 
 * @param startDate - Event start date (ISO 8601 string)
 * @returns Human-readable time until event
 * 
 * @example
 * getTimeUntilEvent('2026-06-15T09:00:00Z') // => 'in 4 months'
 */
export function getTimeUntilEvent(startDate: string): string {
  const now = new Date();
  const start = new Date(startDate);
  const diffMs = start.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Started';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  if (diffDays < 30) return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  
  const diffMonths = Math.floor(diffDays / 30);
  return `in ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * 
 * @example
 * truncate('Long description here', 10) // => 'Long desc...'
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
