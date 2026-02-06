\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_cols text[];
  enum_values text[];
BEGIN
  -- Fail fast if OTP table still exists.
  IF to_regclass('public.otp_verifications') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy table detected: public.otp_verifications must not exist';
  END IF;

  -- Fail fast if legacy transaction columns are still present.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name IN (
        'zarinpalAuthority',
        'zarinpalRefId',
        'digipayTicket',
        'digipayTrackingCode',
        'zibalTrackId',
        'zibalRefNumber'
      )
  ) THEN
    RAISE EXCEPTION 'Legacy payment columns still exist on public.transactions';
  END IF;

  -- Ensure required new columns exist.
  SELECT array_agg(required_col ORDER BY required_col)
  INTO missing_cols
  FROM (
    SELECT unnest(
      ARRAY[
        'paymentMethod',
        'stripePaymentIntentId',
        'stripeCheckoutSessionId',
        'stripeChargeId',
        'paypalOrderId',
        'paypalCaptureId',
        'paymentProviderRef',
        'paymentMetadata'
      ]
    ) AS required_col
    EXCEPT
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
  ) missing;

  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required transactions columns: %', missing_cols;
  END IF;

  -- Ensure enum values are exactly STRIPE and PAYPAL.
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = 'public'
    AND t.typname = 'PaymentMethod';

  IF enum_values IS NULL THEN
    RAISE EXCEPTION 'Enum public.PaymentMethod does not exist';
  END IF;

  IF enum_values <> ARRAY['STRIPE', 'PAYPAL'] THEN
    RAISE EXCEPTION 'Invalid PaymentMethod enum values: %', enum_values;
  END IF;

  -- Verify critical lookup indexes used by provider callbacks.
  IF to_regclass('public.transactions_stripe_paymentintent_idx') IS NULL THEN
    RAISE EXCEPTION 'Missing index: public.transactions_stripe_paymentintent_idx';
  END IF;

  IF to_regclass('public.transactions_paypal_order_idx') IS NULL THEN
    RAISE EXCEPTION 'Missing index: public.transactions_paypal_order_idx';
  END IF;
END $$;
