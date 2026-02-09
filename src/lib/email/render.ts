/**
 * Email Template Renderer
 * 
 * Converts React email components to HTML strings.
 * Uses react-dom/server for server-side rendering.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';

/**
 * Render React email component to HTML string
 */
export function renderEmailTemplate(component: React.ReactElement): string {
  try {
    const html = renderToStaticMarkup(component);
    return formatEmailHtml(html);
  } catch (error) {
    console.error('Email template render error:', error);
    throw new Error('Failed to render email template');
  }
}

/**
 * Format HTML for email clients
 * Adds DOCTYPE and ensures proper structure
 */
function formatEmailHtml(html: string): string {
  // Add DOCTYPE if not present
  if (!html.startsWith('<!DOCTYPE')) {
    html = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + html;
  }

  return html;
}

/**
 * Generate plain text version from HTML
 * Strips HTML tags and formats for plain text email clients
 */
export function htmlToText(html: string): string {
  let text = html;

  // Remove script and style tags
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert common HTML elements to text
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Convert links to text with URL
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 newlines
  text = text.replace(/[ \t]+/g, ' '); // Collapse spaces
  text = text.trim();

  return text;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
  };

  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Preview email in development
 * Returns both HTML and text versions
 */
export function previewEmail(component: React.ReactElement): {
  html: string;
  text: string;
} {
  const html = renderEmailTemplate(component);
  const text = htmlToText(html);

  return { html, text };
}
