'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { validatePassword } from '@/lib/utils/password-validation';
import { useFormState } from '@/hooks/useFormState';

interface OTPPasswordResetProps {
  userPhone?: string | null;
  userEmail?: string | null;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}

export default function OTPPasswordReset({
  userPhone,
  userEmail,
  onSuccess,
  onCancel,
}: OTPPasswordResetProps) {
  const [otpResetStep, setOtpResetStep] = useState<'send' | 'verify'>('send');
  const [otpResetForm, setOtpResetForm] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [formState, formActions] = useFormState();

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    formActions.setIsSubmitting(true);
    formActions.clearMessages();

    try {
      if (!userPhone && !userEmail) {
        formActions.setError('شماره تلفن یا ایمیل یافت نشد');
        return;
      }

      const requestBody: { phone?: string; email?: string; purpose: string } = {
        purpose: 'login',
      };

      if (userPhone) {
        requestBody.phone = userPhone;
      } else if (userEmail) {
        requestBody.email = userEmail;
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        formActions.setError(data.error || 'خطا در ارسال کد تایید');
        return;
      }

      setOtpResetStep('verify');
      setOtpCountdown(120); // 2 minutes
      const successMessage = userPhone
        ? 'کد تایید به شماره تلفن شما ارسال شد'
        : 'کد تایید به ایمیل شما ارسال شد';
      formActions.setSuccess(successMessage);
    } catch (error) {
      formActions.setError('خطا در ارسال کد تایید');
      console.error('Error sending OTP:', error);
    } finally {
      formActions.setIsSubmitting(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    formActions.setIsSubmitting(true);
    formActions.clearMessages();

    // Validate password
    const validation = validatePassword(
      otpResetForm.newPassword,
      otpResetForm.confirmPassword
    );
    if (!validation.isValid) {
      formActions.setError(validation.error || 'خطا در اعتبارسنجی رمز عبور');
      formActions.setIsSubmitting(false);
      return;
    }

    if (!otpResetForm.otp) {
      formActions.setError('کد تایید را وارد کنید');
      formActions.setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/user/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otpResetForm.otp,
          newPassword: otpResetForm.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        formActions.setError(data.error || 'خطا در بازیابی رمز عبور');
        return;
      }

      formActions.setSuccess('رمز عبور با موفقیت بازیابی شد');
      setOtpResetForm({
        otp: '',
        newPassword: '',
        confirmPassword: '',
      });
      setOtpResetStep('send');
      await onSuccess();
    } catch (error) {
      formActions.setError('خطا در بازیابی رمز عبور');
      console.error('Error resetting password with OTP:', error);
    } finally {
      formActions.setIsSubmitting(false);
    }
  };

  const handleCancelReset = () => {
    setOtpResetForm({
      otp: '',
      newPassword: '',
      confirmPassword: '',
    });
    formActions.reset();
    setOtpResetStep('send');
    setOtpCountdown(0);
    onCancel();
  };

  return (
    <div className="space-y-4 text-right">
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

      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4">
        <p className="text-sm text-rose-700">
          {otpResetStep === 'send'
            ? 'کد تایید به شماره تلفن یا ایمیل شما ارسال خواهد شد'
            : `کد تایید را وارد کنید (${otpCountdown > 0 ? `${otpCountdown} ثانیه` : 'منقضی شده'})`}
        </p>
      </div>

      {otpResetStep === 'send' ? (
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleCancelReset}>
            انصراف
          </Button>
          <Button
            variant="primary"
            onClick={handleSendOtp}
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? 'در حال ارسال...' : 'ارسال کد تایید'}
          </Button>
        </div>
      ) : (
        <>
          <Input
            label="کد تایید"
            type="text"
            value={otpResetForm.otp}
            onChange={(e) =>
              setOtpResetForm({ ...otpResetForm, otp: e.target.value })
            }
            className="text-center tracking-widest"
            placeholder="کد ۶ رقمی"
            maxLength={6}
            dir="ltr"
          />
          <Input
            label="رمز عبور جدید"
            type="password"
            value={otpResetForm.newPassword}
            onChange={(e) =>
              setOtpResetForm({
                ...otpResetForm,
                newPassword: e.target.value,
              })
            }
            placeholder="حداقل ۸ کاراکتر"
          />
          <Input
            label="تکرار رمز عبور جدید"
            type="password"
            value={otpResetForm.confirmPassword}
            onChange={(e) =>
              setOtpResetForm({
                ...otpResetForm,
                confirmPassword: e.target.value,
              })
            }
          />
          <div className="flex gap-3 justify-between">
            <button
              onClick={handleSendOtp}
              disabled={otpCountdown > 0 || formState.isSubmitting}
              className="text-sm text-rose-600 hover:text-rose-700 disabled:text-gray-400 disabled:no-underline"
            >
              {otpCountdown > 0
                ? `ارسال مجدد (${otpCountdown}s)`
                : 'ارسال مجدد کد'}
            </button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleCancelReset}>
                انصراف
              </Button>
              <Button
                variant="primary"
                onClick={handleVerifyOtpAndReset}
                disabled={formState.isSubmitting}
              >
                {formState.isSubmitting
                  ? 'در حال بازیابی...'
                  : 'بازیابی رمز عبور'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
