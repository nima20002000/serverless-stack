'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { validatePassword } from '@/lib/utils/password-validation';
import { useFormState } from '@/hooks/useFormState';

interface PasswordManagementCardProps {
  hasPassword: boolean;
  onPasswordUpdate: () => Promise<void>;
}

export default function PasswordManagementCard({
  hasPassword,
  onPasswordUpdate,
}: PasswordManagementCardProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formState, formActions] = useFormState();

  const handlePasswordSubmit = async () => {
    formActions.setIsSubmitting(true);
    formActions.clearMessages();

    // Validate password
    const validation = validatePassword(
      passwordForm.newPassword,
      passwordForm.confirmPassword
    );
    if (!validation.isValid) {
      formActions.setError(validation.error || 'Enter a valid password.');
      formActions.setIsSubmitting(false);
      return;
    }

    if (hasPassword && !passwordForm.currentPassword) {
      formActions.setError('Enter your current password.');
      formActions.setIsSubmitting(false);
      return;
    }

    try {
      const action = hasPassword ? 'change' : 'set';
      const body: Record<string, string> = {
        newPassword: passwordForm.newPassword,
        action,
      };

      if (action === 'change') {
        body.currentPassword = passwordForm.currentPassword;
      }

      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        formActions.setError(data.error || 'Unable to update password.');
        return;
      }

      formActions.setSuccess(data.message || 'Password updated successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      await onPasswordUpdate();
    } catch (error) {
      formActions.setError('Unable to update password.');
      console.error('Error managing password:', error);
    } finally {
      formActions.setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    formActions.reset();
  };

  return (
    <>
      {formState.success && (
        <Alert type="success" className="mb-4">
          {formState.success}
        </Alert>
      )}
      {formState.error && (
        <Alert
          type="error"
          className="mb-4"
          onClose={() => formActions.setError('')}
        >
          {formState.error}
        </Alert>
      )}

      {isChangingPassword ? (
        <div className="space-y-4">
          {hasPassword && (
            <Input
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          )}
          <Input
            label="New password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                newPassword: e.target.value,
              })
            }
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                confirmPassword: e.target.value,
              })
            }
            autoComplete="new-password"
          />
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePasswordSubmit}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? 'Saving...' : 'Save password'}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            {hasPassword
              ? 'Use a strong password and update it when needed.'
              : 'Set a password to sign in with your account credentials.'}
          </p>
          <div className="flex gap-3 items-center">
            <Button
              variant="secondary"
              onClick={() => setIsChangingPassword(true)}
            >
              {hasPassword ? 'Change password' : 'Set password'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
