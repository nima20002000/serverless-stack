'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatNumber } from '@/lib/utils/format';

export interface BulkAction<T = unknown> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (selectedIds: string[], data?: T) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

interface BulkActionsToolbarProps<T = unknown> {
  selectedCount: number;
  actions: BulkAction<T>[];
  onClearSelection: () => void;
}

export default function BulkActionsToolbar<T = unknown>({
  selectedCount,
  actions,
  onClearSelection,
}: BulkActionsToolbarProps<T>) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleAction = async (action: BulkAction<T>, selectedIds: string[]) => {
    if (action.requiresConfirmation) {
      const message =
        action.confirmationMessage ||
        `Apply this action to ${selectedCount} selected item(s)?`;
      if (!confirm(message)) {
        return;
      }
    }

    try {
      setIsProcessing(true);
      await action.onClick(selectedIds);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-blue-600 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 dark:bg-slate-900 dark:border dark:border-slate-800 dark:shadow-none">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">
            {formatNumber(selectedCount)}
          </span>
          <span className="text-sm">selected</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-blue-400 dark:bg-slate-700" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={() => handleAction(action, [])}
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-blue-500 dark:hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Clear selection"
          disabled={isProcessing}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
