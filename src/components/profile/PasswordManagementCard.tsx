'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { validatePassword } from '@/lib/utils/password-validation';
import { useFormState } from '@/hooks/useFormState';

interface PasswordManagementCardProps {
  hasPassword: boolean;
  onPasswordUpdate: () => Promise<void>;
  onStartOtpReset?: () => void;
  showOtpResetOption?: boolean;
}

export default function PasswordManagementCard({
  hasPassword,
  onPasswordUpdate,
  onStartOtpReset,
  showOtpResetOption = false,
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
      formActions.setError(validation.error || 'خطا در اعتبارسنجی رمز عبور');
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
        formActions.setError(data.error || 'خطا در مدیریت رمز عبور');
        return;
      }

      formActions.setSuccess(data.message);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      await onPasswordUpdate();
    } catch (error) {
      formActions.setError('خطا در مدیریت رمز عبور');
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
        <div className="space-y-4 text-right">
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رمز عبور فعلی
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="رمز عبور فعلی خود را وارد کنید"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور جدید
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="حداقل ۸ کاراکتر"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تکرار رمز عبور جدید
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={formState.isSubmitting}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handlePasswordSubmit}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? 'در حال ذخیره...' : 'ذخیره رمز عبور'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-right">
          <p className="text-gray-600 mb-4">
            {hasPassword
              ? 'شما می‌توانید رمز عبور خود را تغییر دهید.'
              : 'شما می‌توانید برای حساب کاربری خود رمز عبور تنظیم کنید'}
          </p>
          <div className="flex gap-3 items-center">
            <Button
              variant="secondary"
              onClick={() => setIsChangingPassword(true)}
            >
              {hasPassword ? 'تغییر رمز عبور' : 'تنظیم رمز عبور'}
            </Button>
            {showOtpResetOption && hasPassword && onStartOtpReset && (
              <p className="text-sm text-gray-500">
                رمز عبور خود را فراموش کرده‌اید؟{' '}
                <span
                  className="text-blue-600 hover:underline cursor-pointer"
                  onClick={onStartOtpReset}
                >
                  بازیابی از طریق OTP
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
