// English-only for v1. The catalog shape is kept so another locale can be
// added later without touching call sites.

export const SUPPORTED_LOCALES = ['en'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const messages = {
  en: {
    'manual.title': 'Add missed contraction',
    'manual.close': 'Close manual entry',
    'manual.description': 'Use this when timing started late or a contraction was missed. The entry will be clearly marked as manual.',
    'manual.started': 'Started',
    'manual.ended': 'Ended',
    'manual.save': 'Save manual entry',
    'manual.invalidTimes': 'Enter a valid start and end time.',
    'manual.endBeforeStart': 'The end time must be after the start time.',
    'manual.futureEnd': 'A completed contraction cannot end in the future.',
    'manual.tooLong': 'Check the times—the duration is longer than four hours.',
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function getLocale(): SupportedLocale { return 'en'; }

export function t(key: MessageKey, values: Readonly<Record<string, string | number>> = {}): string {
  return messages.en[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => (
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  ));
}
