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
            <Input
              label="رمز عبور فعلی"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              placeholder="رمز عبور فعلی خود را وارد کنید"
            />
          )}
          <Input
            label="رمز عبور جدید"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                newPassword: e.target.value,
              })
            }
            placeholder="حداقل ۸ کاراکتر"
          />
          <Input
            label="تکرار رمز عبور جدید"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                confirmPassword: e.target.value,
              })
            }
          />
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
          </div>
        </div>
      )}
    </>
  );
}
