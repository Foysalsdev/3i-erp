// Simple sanitizer — removes HTML tags from text inputs
// For full DOMPurify support, install: npm install dompurify @types/dompurify

export function sanitizeText(input: string): string {
  if (!input) return input
  // Remove HTML tags and scripts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export function sanitizeHtml(input: string): string {
  return sanitizeText(input)
}
