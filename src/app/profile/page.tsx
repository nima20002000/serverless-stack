'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { signOut } from 'next-auth/react';
import { format } from 'date-fns-jalali';
import { normalizePhoneNumber, isValidIranianPhone, isValidName } from '@/lib/utils/persian';

interface PromoCode {
  id: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
}

interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string | null;
  phone: string | null;
  shippingAddress: string | null;
  postalCode: string | null;
  role: string;
  createdAt: string;
  hasPassword: boolean;
}

interface Transaction {
  id: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'ZARINPAL' | 'DIGIPAY';
  isGuest: boolean;
  transactionCode: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: string;
    product: {
      id: string;
      name: string;
      price: string;
      media: Array<{
        url: string;
        alt: string | null;
      }>;
    };
  }[];
  invoice: {
    invoiceNumber: string;
    generatedAt: string;
    pdfUrl: string | null;
  } | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    shippingAddress: '',
    postalCode: '',
  });
  const [editError, setEditError] = useState<string>('');
  const [editSuccess, setEditSuccess] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password management states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // OTP password reset states
  const [isResettingWithOTP, setIsResettingWithOTP] = useState(false);
  const [otpResetStep, setOtpResetStep] = useState<'send' | 'verify'>('send');
  const [otpResetForm, setOtpResetForm] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpResetError, setOtpResetError] = useState<string>('');
  const [otpResetSuccess, setOtpResetSuccess] = useState<string>('');
  const [isSubmittingOtpReset, setIsSubmittingOtpReset] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (promoCode && !promoCode.isUsed) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(promoCode.expiresAt);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining('منقضی شده');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [promoCode]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const fetchPromoCode = useCallback(async () => {
    try {
      const response = await fetch('/api/promo/active');
      if (response.ok) {
        const data = await response.json();
        setPromoCode(data.promoCode);
      } else {
        setPromoCode(null);
      }
    } catch (error) {
      console.error('Error fetching promo code:', error);
      setPromoCode(null);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        setEditForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          shippingAddress: data.shippingAddress || '',
          postalCode: data.postalCode || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch('/api/user/transactions?limit=5');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const handleEditProfile = useCallback(() => {
    setIsEditingProfile(true);
    setEditError('');
    setEditSuccess('');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
    setEditError('');
    setEditSuccess('');
    if (userProfile) {
      setEditForm({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        shippingAddress: userProfile.shippingAddress || '',
        postalCode: userProfile.postalCode || '',
      });
    }
  }, [userProfile]);

  const handleSaveProfile = useCallback(async () => {
    setIsUpdating(true);
    setEditError('');
    setEditSuccess('');

    // Validate name
    if (editForm.name.trim() && !isValidName(editForm.name)) {
      setEditError('نام باید شامل حروف فارسی یا انگلیسی باشد');
      setIsUpdating(false);
      return;
    }

    // Validate phone if provided
    if (editForm.phone.trim()) {
      const normalizedPhone = normalizePhoneNumber(editForm.phone);
      if (!isValidIranianPhone(normalizedPhone)) {
        setEditError('شماره تلفن نامعتبر است (از اعداد فارسی یا انگلیسی استفاده کنید)');
        setIsUpdating(false);
        return;
      }
    }

    try {
      // Normalize phone before sending
      const normalizedData = {
        ...editForm,
        phone: editForm.phone ? normalizePhoneNumber(editForm.phone) : editForm.phone,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || 'خطا در به‌روزرسانی پروفایل');
        return;
      }

      setEditSuccess('پروفایل با موفقیت به‌روزرسانی شد');
      setIsEditingProfile(false);
      await fetchUserProfile();
      await update(); // Update session
    } catch (error) {
      setEditError('خطا در به‌روزرسانی پروفایل');
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [editForm, fetchUserProfile, update]);

  const handlePasswordSubmit = useCallback(async () => {
    setIsSubmittingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    // Validate
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('رمز عبور جدید و تکرار آن مطابقت ندارند');
      setIsSubmittingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      setIsSubmittingPassword(false);
      return;
    }

    try {
      const action = userProfile?.hasPassword ? 'change' : 'set';
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
        setPasswordError(data.error || 'خطا در مدیریت رمز عبور');
        return;
      }

      setPasswordSuccess(data.message);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      await fetchUserProfile();
    } catch (error) {
      setPasswordError('خطا در مدیریت رمز عبور');
      console.error('Error managing password:', error);
    } finally {
      setIsSubmittingPassword(false);
    }
  }, [passwordForm, userProfile?.hasPassword, fetchUserProfile]);

  const handleSendOtpForReset = useCallback(async () => {
    setIsSubmittingOtpReset(true);
    setOtpResetError('');

    try {
      if (!userProfile?.phone && !userProfile?.email) {
        setOtpResetError('شماره تلفن یا ایمیل یافت نشد');
        return;
      }

      const requestBody: { phone?: string; email?: string; purpose: string } = {
        purpose: 'login',
      };

      if (userProfile.phone) {
        requestBody.phone = userProfile.phone;
      } else if (userProfile.email) {
        requestBody.email = userProfile.email;
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpResetError(data.error || 'خطا در ارسال کد تایید');
        return;
      }

      setOtpResetStep('verify');
      setOtpCountdown(120); // 2 minutes
      const successMessage = userProfile.phone
        ? 'کد تایید به شماره تلفن شما ارسال شد'
        : 'کد تایید به ایمیل شما ارسال شد';
      setOtpResetSuccess(successMessage);
    } catch (error) {
      setOtpResetError('خطا در ارسال کد تایید');
      console.error('Error sending OTP:', error);
    } finally {
      setIsSubmittingOtpReset(false);
    }
  }, [userProfile?.phone, userProfile?.email]);

  const handleVerifyOtpAndReset = useCallback(async () => {
    setIsSubmittingOtpReset(true);
    setOtpResetError('');

    // Validate
    if (otpResetForm.newPassword !== otpResetForm.confirmPassword) {
      setOtpResetError('رمز عبور جدید و تکرار آن مطابقت ندارند');
      setIsSubmittingOtpReset(false);
      return;
    }

    if (otpResetForm.newPassword.length < 8) {
      setOtpResetError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      setIsSubmittingOtpReset(false);
      return;
    }

    if (!otpResetForm.otp) {
      setOtpResetError('کد تایید را وارد کنید');
      setIsSubmittingOtpReset(false);
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
        setOtpResetError(data.error || 'خطا در بازیابی رمز عبور');
        return;
      }

      setPasswordSuccess('رمز عبور با موفقیت بازیابی شد');
      setOtpResetForm({
        otp: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsResettingWithOTP(false);
      setOtpResetStep('send');
      await fetchUserProfile();
    } catch (error) {
      setOtpResetError('خطا در بازیابی رمز عبور');
      console.error('Error resetting password with OTP:', error);
    } finally {
      setIsSubmittingOtpReset(false);
    }
  }, [otpResetForm, fetchUserProfile]);

  const handleStartOtpReset = useCallback(() => {
    setIsResettingWithOTP(true);
    setIsChangingPassword(false);
    setPasswordError('');
    setPasswordSuccess('');
    setOtpResetError('');
    setOtpResetSuccess('');
    setOtpResetStep('send');
  }, []);

  const handleCancelOtpReset = useCallback(() => {
    setIsResettingWithOTP(false);
    setOtpResetForm({
      otp: '',
      newPassword: '',
      confirmPassword: '',
    });
    setOtpResetError('');
    setOtpResetSuccess('');
    setOtpResetStep('send');
    setOtpCountdown(0);
  }, []);

  // This useEffect depends on callbacks, so must be after their definition
  useEffect(() => {
    if (session?.user) {
      fetchPromoCode();
      fetchUserProfile();
      fetchTransactions();
    }
  }, [session, fetchPromoCode, fetchUserProfile, fetchTransactions]);

  const getStatusBadge = useCallback((status: string) => {
    const colors = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    const labels = {
      COMPLETED: 'موفق',
      PENDING: 'در انتظار',
      FAILED: 'ناموفق',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }, []);

  // Memoize transaction rendering to avoid recalculation on every render
  // Must be called before any early returns to follow Rules of Hooks
  const renderedTransactions = useMemo(() => {
    if (transactionsLoading) {
      return <div className="text-center py-8 text-gray-600">در حال بارگذاری...</div>;
    }

    if (transactions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-600">
          هنوز تراکنشی ثبت نشده است
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  کد تراکنش: {transaction.transactionCode}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {format(new Date(transaction.createdAt), 'yyyy/MM/dd - HH:mm')}
                </div>
              </div>
              {getStatusBadge(transaction.status)}
            </div>

            <div className="border-t border-gray-100 pt-3 mt-3">
              <div className="text-sm text-gray-600 mb-2">محصولات:</div>
              <div className="space-y-2">
                {transaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {Number(item.price).toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
              <span className="text-gray-700 font-medium">مبلغ کل:</span>
              <span className="text-lg font-bold text-gray-900">
                {Number(transaction.amount).toLocaleString('fa-IR')} تومان
              </span>
            </div>

            {transaction.invoice && (
              <div className="mt-3 text-sm text-gray-600">
                شماره فاکتور: {transaction.invoice.invoiceNumber}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [transactions, transactionsLoading, getStatusBadge]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-right">
          پروفایل کاربری
        </h1>

        {/* Success/Error Messages */}
        {editSuccess && (
          <Alert type="success" className="mb-6">
            {editSuccess}
          </Alert>
        )}
        {editError && (
          <Alert type="error" className="mb-6">
            {editError}
          </Alert>
        )}

        {/* User Info Card */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 text-right">
              اطلاعات کاربری
            </h2>
            {!isEditingProfile && (
              <Button variant="secondary" onClick={handleEditProfile}>
                ویرایش
              </Button>
            )}
          </div>

          {isEditingProfile ? (
            <div className="space-y-4 text-right">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ایمیل
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  شماره تلفن
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="09xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  آدرس ارسال
                </label>
                <textarea
                  value={editForm.shippingAddress}
                  onChange={(e) => setEditForm({ ...editForm, shippingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کد پستی
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="1234567890"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-right">
              <div>
                <span className="text-gray-600">شناسه کاربری:</span>{' '}
                <code className="font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                  {userProfile.uid}
                </code>
              </div>
              <div>
                <span className="text-gray-600">نام:</span>{' '}
                <span className="font-medium text-gray-900">{userProfile.name}</span>
              </div>
              <div>
                <span className="text-gray-600">ایمیل:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.email || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">شماره تلفن:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.phone || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">آدرس ارسال:</span>{' '}
                <span className="font-medium text-gray-900">
                  {userProfile.shippingAddress || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">کد پستی:</span>{' '}
                <span className="font-medium text-gray-900" dir="ltr">
                  {userProfile.postalCode || 'وارد نشده'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">نقش:</span>{' '}
                <span className="font-medium text-gray-900">
                  {userProfile.role === 'ADMIN' ? 'مدیر' : 'کاربر'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">عضو از:</span>{' '}
                <span className="font-medium text-gray-900">
                  {format(new Date(userProfile.createdAt), 'yyyy/MM/dd')}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Password Management Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
            مدیریت رمز عبور
          </h2>

          {passwordSuccess && (
            <Alert type="success" className="mb-4">
              {passwordSuccess}
            </Alert>
          )}
          {passwordError && (
            <Alert type="error" className="mb-4">
              {passwordError}
            </Alert>
          )}
          {otpResetSuccess && (
            <Alert type="success" className="mb-4">
              {otpResetSuccess}
            </Alert>
          )}
          {otpResetError && (
            <Alert type="error" className="mb-4">
              {otpResetError}
            </Alert>
          )}

          {isResettingWithOTP ? (
            <div className="space-y-4 text-right">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  {otpResetStep === 'send'
                    ? 'کد تایید به شماره تلفن یا ایمیل شما ارسال خواهد شد'
                    : `کد تایید را وارد کنید (${otpCountdown > 0 ? `${otpCountdown} ثانیه` : 'منقضی شده'})`}
                </p>
              </div>

              {otpResetStep === 'send' ? (
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" onClick={handleCancelOtpReset}>
                    انصراف
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendOtpForReset}
                    disabled={isSubmittingOtpReset}
                  >
                    {isSubmittingOtpReset ? 'در حال ارسال...' : 'ارسال کد تایید'}
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد تایید
                    </label>
                    <input
                      type="text"
                      value={otpResetForm.otp}
                      onChange={(e) =>
                        setOtpResetForm({ ...otpResetForm, otp: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-center"
                      placeholder="کد ۶ رقمی"
                      maxLength={6}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رمز عبور جدید
                    </label>
                    <input
                      type="password"
                      value={otpResetForm.newPassword}
                      onChange={(e) =>
                        setOtpResetForm({ ...otpResetForm, newPassword: e.target.value })
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
                      value={otpResetForm.confirmPassword}
                      onChange={(e) =>
                        setOtpResetForm({ ...otpResetForm, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex gap-3 justify-between">
                    <button
                      onClick={handleSendOtpForReset}
                      disabled={otpCountdown > 0 || isSubmittingOtpReset}
                      className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {otpCountdown > 0 ? `ارسال مجدد (${otpCountdown}s)` : 'ارسال مجدد کد'}
                    </button>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={handleCancelOtpReset}>
                        انصراف
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleVerifyOtpAndReset}
                        disabled={isSubmittingOtpReset}
                      >
                        {isSubmittingOtpReset ? 'در حال بازیابی...' : 'بازیابی رمز عبور'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : isChangingPassword ? (
            <div className="space-y-4 text-right">
              {userProfile.hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رمز عبور فعلی
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
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
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
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
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  disabled={isSubmittingPassword}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePasswordSubmit}
                  disabled={isSubmittingPassword}
                >
                  {isSubmittingPassword ? 'در حال ذخیره...' : 'ذخیره رمز عبور'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-gray-600 mb-4">
                {userProfile.hasPassword
                  ? 'شما می‌توانید رمز عبور خود را تغییر دهید.'
                  : 'شما می‌توانید برای حساب کاربری خود رمز عبور تنظیم کنید'}
              </p>
              <div className="flex gap-3 items-center">
                <Button variant="secondary" onClick={() => setIsChangingPassword(true)}>
                  {userProfile.hasPassword ? 'تغییر رمز عبور' : 'تنظیم رمز عبور'}
                </Button>
                {userProfile.hasPassword && (userProfile.phone || userProfile.email) && (
                  <p className="text-sm text-gray-500">
                    رمز عبور خود را فراموش کرده‌اید؟{' '}
                    <span
                      className="text-blue-600 hover:underline cursor-pointer"
                      onClick={handleStartOtpReset}
                    >
                      بازیابی از طریق OTP
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Promo Code Card */}
        {promoCode && !promoCode.isUsed && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
              کد تخفیف ویژه شما
            </h2>
            <Alert type="info">
              <div className="text-right">
                <div className="mb-2">
                  <span className="text-lg font-bold">{promoCode.code}</span>
                </div>
                <div className="text-sm">
                  زمان باقی‌مانده: <span className="font-mono font-bold">{timeRemaining}</span>
                </div>
                <div className="text-xs mt-2 text-gray-600">
                  از این کد برای دریافت تخفیف در اولین خرید خود استفاده کنید!
                </div>
              </div>
            </Alert>
          </Card>
        )}

        {promoCode?.isUsed && (
          <Card className="mb-6">
            <Alert type="success">شما از کد تخفیف خود استفاده کرده‌اید.</Alert>
          </Card>
        )}

        {/* Transaction History Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-right">
            تاریخچه تراکنش‌ها
          </h2>
          {renderedTransactions}
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button variant="danger" onClick={() => signOut({ callbackUrl: '/login' })}>
            خروج از حساب کاربری
          </Button>
        </div>
      </div>
    </div>
  );
}
