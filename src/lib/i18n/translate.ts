import type { Messages, TranslationKey } from './dictionaries';

type TranslationValues = Record<string, string | number>;

function readMessage(messages: Messages, key: TranslationKey): string | null {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, messages);

  return typeof value === 'string' ? value : null;
}

export function interpolateMessage(
  message: string,
  values: TranslationValues = {}
): string {
  return message.replace(/\{(\w+)\}/g, (match, name) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(messages: Messages) {
  return (key: TranslationKey, values?: TranslationValues): string => {
    const message = readMessage(messages, key);

    if (!message) {
      const fallback = `[[missing:${key}]]`;
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`Missing translation key: ${key}`);
      }
      console.warn(fallback);
      return fallback;
    }

    return interpolateMessage(message, values);
  };
}
