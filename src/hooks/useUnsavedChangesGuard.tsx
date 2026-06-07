'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

type PendingNavigation =
  | { type: 'href'; href: string }
  | { type: 'back' }
  | { type: 'history'; delta: number }
  | { type: 'callback'; callback: () => void };

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  title?: string;
  message?: string;
};

const UNSAVED_CHANGES_SENTINEL = '__unsavedChangesGuardSentinel';

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest('a[href]');
}

function getCurrentHref(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getSentinelState(): History['state'] {
  return {
    ...(window.history.state ?? {}),
    [UNSAVED_CHANGES_SENTINEL]: true,
  };
}

export function useUnsavedChangesGuard({
  isDirty,
  title = 'Discard unsaved changes?',
  message = 'You have unsaved product changes. If you leave now, those changes will be lost.',
}: UseUnsavedChangesGuardOptions) {
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const allowNextNavigationRef = useRef(false);
  const dirtyRef = useRef(isDirty);
  const historySentinelRef = useRef({ active: false, href: '' });

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const allowNextNavigation = useCallback(() => {
    allowNextNavigationRef.current = true;
    window.setTimeout(() => {
      allowNextNavigationRef.current = false;
    }, 1000);
  }, []);

  const runAllowedNavigation = useCallback(
    (callback: () => void, options: { waitForPopState?: boolean } = {}) => {
      allowNextNavigationRef.current = true;
      callback();
      window.setTimeout(
        () => {
          allowNextNavigationRef.current = false;
        },
        options.waitForPopState ? 1000 : 0
      );
    },
    []
  );

  const hasCurrentHistorySentinel = useCallback(() => {
    return (
      window.history.state?.[UNSAVED_CHANGES_SENTINEL] === true ||
      (historySentinelRef.current.active &&
        historySentinelRef.current.href === getCurrentHref())
    );
  }, []);

  const runBackNavigation = useCallback(() => {
    if (hasCurrentHistorySentinel()) {
      window.history.go(-2);
      return true;
    }

    router.back();
    return false;
  }, [hasCurrentHistorySentinel, router]);

  const runHrefNavigation = useCallback(
    (href: string) => {
      if (hasCurrentHistorySentinel()) {
        router.replace(href);
        return;
      }

      router.push(href);
    },
    [hasCurrentHistorySentinel, router]
  );

  const allowedPush = useCallback(
    (href: string) => {
      runAllowedNavigation(() => {
        runHrefNavigation(href);
      });
    },
    [runAllowedNavigation, runHrefNavigation]
  );

  const requestNavigation = useCallback(
    (navigation: PendingNavigation) => {
      if (!dirtyRef.current || allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        if (navigation.type === 'href') runHrefNavigation(navigation.href);
        if (navigation.type === 'back') runBackNavigation();
        if (navigation.type === 'history') window.history.go(navigation.delta);
        if (navigation.type === 'callback') navigation.callback();
        return;
      }

      setPendingNavigation(navigation);
    },
    [runBackNavigation, runHrefNavigation]
  );

  const guardedPush = useCallback(
    (href: string) => requestNavigation({ type: 'href', href }),
    [requestNavigation]
  );

  const guardedBack = useCallback(
    () => requestNavigation({ type: 'back' }),
    [requestNavigation]
  );

  const guardedAction = useCallback(
    (callback: () => void) => requestNavigation({ type: 'callback', callback }),
    [requestNavigation]
  );

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const confirmNavigation = useCallback(() => {
    const navigation = pendingNavigation;
    if (!navigation) return;

    setPendingNavigation(null);
    const willWaitForPopState =
      navigation.type === 'history' ||
      (navigation.type === 'back' && hasCurrentHistorySentinel());

    runAllowedNavigation(
      () => {
        if (navigation.type === 'href') runHrefNavigation(navigation.href);
        if (navigation.type === 'back') runBackNavigation();
        if (navigation.type === 'history') window.history.go(navigation.delta);
        if (navigation.type === 'callback') navigation.callback();
      },
      { waitForPopState: willWaitForPopState }
    );
  }, [
    hasCurrentHistorySentinel,
    pendingNavigation,
    runAllowedNavigation,
    runBackNavigation,
    runHrefNavigation,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current || allowNextNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isDirty) {
      if (hasCurrentHistorySentinel()) {
        runAllowedNavigation(
          () => {
            window.history.back();
          },
          { waitForPopState: true }
        );
      }
      historySentinelRef.current.active = false;
      return;
    }

    const href = getCurrentHref();
    if (hasCurrentHistorySentinel()) {
      historySentinelRef.current = { active: true, href };
      return;
    }

    window.history.pushState(getSentinelState(), '', href);
    historySentinelRef.current = { active: true, href };
  }, [hasCurrentHistorySentinel, isDirty, runAllowedNavigation]);

  useEffect(() => {
    const handlePopState = () => {
      if (!dirtyRef.current) {
        if (window.history.state?.[UNSAVED_CHANGES_SENTINEL] === true) {
          window.history.back();
        }
        allowNextNavigationRef.current = false;
        historySentinelRef.current.active = false;
        return;
      }

      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        historySentinelRef.current.active = false;
        return;
      }

      const href = getCurrentHref();
      window.history.pushState(getSentinelState(), '', href);
      historySentinelRef.current = { active: true, href };
      setPendingNavigation({ type: 'history', delta: -2 });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!dirtyRef.current || allowNextNavigationRef.current) return;
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = findAnchor(event.target);
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const href = `${destination.pathname}${destination.search}${destination.hash}`;
      const currentHref = getCurrentHref();
      if (href === currentHref) return;

      event.preventDefault();
      setPendingNavigation({ type: 'href', href });
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  const dialog = (
    <Modal
      isOpen={!!pendingNavigation}
      onClose={cancelNavigation}
      title={title}
      size="md"
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={cancelNavigation}>
            Stay on page
          </Button>
          <Button type="button" variant="danger" onClick={confirmNavigation}>
            Discard changes
          </Button>
        </div>
      </div>
    </Modal>
  );

  return {
    allowNextNavigation,
    allowedPush,
    guardedPush,
    guardedBack,
    guardedAction,
    dialog,
    hasPendingNavigation: !!pendingNavigation,
  };
}
