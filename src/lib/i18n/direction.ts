export type TextDirection = 'ltr' | 'rtl';

export function parseTextDirection(
  value: string | null | undefined
): TextDirection | null {
  if (value === 'ltr' || value === 'rtl') return value;
  return null;
}

export function resolveTextDirection(options: {
  configuredDirection?: string | null;
  localeDirection: TextDirection;
}): TextDirection {
  return (
    parseTextDirection(options.configuredDirection) ?? options.localeDirection
  );
}

export function getCartDrawerDirectionClasses(direction: TextDirection) {
  if (direction === 'rtl') {
    return {
      container: 'left-0 pr-10',
      enterFrom: '-translate-x-full',
      leaveTo: '-translate-x-full',
    };
  }

  return {
    container: 'right-0 pl-10',
    enterFrom: 'translate-x-full',
    leaveTo: 'translate-x-full',
  };
}

export function getPreviousChevronClass(direction: TextDirection): string {
  return direction === 'rtl' ? 'rotate-180' : '';
}

export function getNextChevronClass(direction: TextDirection): string {
  return direction === 'rtl' ? 'rotate-180' : '';
}
