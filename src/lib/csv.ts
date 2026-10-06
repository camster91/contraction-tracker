/**
 * Encode a value for CSV while preventing user-authored content from being
 * interpreted as a spreadsheet formula. The leading apostrophe is the common
 * visible text marker used by spreadsheet applications and preserves the
 * remainder of the user's text byte-for-byte.
 */
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  let firstMeaningful = 0;
  while (firstMeaningful < text.length && text.charCodeAt(firstMeaningful) <= 0x20) firstMeaningful += 1;
  if (firstMeaningful < text.length && '=+-@'.includes(text[firstMeaningful])) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
