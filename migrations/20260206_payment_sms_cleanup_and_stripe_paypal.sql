BEGIN;

-- 1) Remove SMS/OTP verification persistence (no SMS confirmations in current plan)
DROP TABLE IF EXISTS public.otp_verifications CASCADE;

-- 2) Remove legacy provider-specific indexes/columns on transactions
DROP INDEX IF EXISTS public.transactions_digipayTicket_idx;
DROP INDEX IF EXISTS public.transactions_zibaltrackid_idx;
DROP INDEX IF EXISTS public.transactions_paymentmethod_idx;

ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS "zarinpalAuthority",
  DROP COLUMN IF EXISTS "zarinpalRefId",
  DROP COLUMN IF EXISTS "digipayTicket",
  DROP COLUMN IF EXISTS "digipayTrackingCode",
  DROP COLUMN IF EXISTS "zibalTrackId",
  DROP COLUMN IF EXISTS "zibalRefNumber";

-- 3) Add Stripe/PayPal/generic payment tracking columns
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeChargeId" TEXT,
  ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderRef" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMetadata" JSONB;

-- 4) Replace PaymentMethod enum values (ZARINPAL/DIGIPAY/ZIBAL -> STRIPE/PAYPAL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PaymentMethod' AND n.nspname = 'public'
  ) THEN
    -- Rename old enum out of the way
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'PaymentMethod_old' AND n.nspname = 'public'
    ) THEN
      ALTER TYPE public."PaymentMethod" RENAME TO "PaymentMethod_old";
    END IF;

    -- Ensure new enum exists
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'PaymentMethod' AND n.nspname = 'public'
    ) THEN
      CREATE TYPE public."PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL');
    END IF;

    -- Convert paymentMethod values to new enum
    ALTER TABLE public.transactions
      ALTER COLUMN "paymentMethod" DROP DEFAULT;

    ALTER TABLE public.transactions
      ALTER COLUMN "paymentMethod" TYPE public."PaymentMethod"
      USING (
        CASE
          WHEN "paymentMethod"::text = 'PAYPAL' THEN 'PAYPAL'
          ELSE 'STRIPE'
        END
      )::public."PaymentMethod";

    ALTER TABLE public.transactions
      ALTER COLUMN "paymentMethod" SET DEFAULT 'STRIPE';

    -- Drop old enum if no longer referenced
    DROP TYPE IF EXISTS public."PaymentMethod_old";
  ELSE
    -- Fresh edge-case: type missing
    BEGIN
      CREATE TYPE public."PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    ALTER TABLE public.transactions
      ALTER COLUMN "paymentMethod" TYPE public."PaymentMethod"
      USING (
        CASE
          WHEN "paymentMethod"::text = 'PAYPAL' THEN 'PAYPAL'
          ELSE 'STRIPE'
        END
      )::public."PaymentMethod";

    ALTER TABLE public.transactions
      ALTER COLUMN "paymentMethod" SET DEFAULT 'STRIPE';
  END IF;
END $$;

-- 5) New indexes for active payment providers
CREATE INDEX IF NOT EXISTS transactions_paymentmethod_idx
  ON public.transactions("paymentMethod");

CREATE INDEX IF NOT EXISTS transactions_stripe_paymentintent_idx
  ON public.transactions("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_stripe_checkout_idx
  ON public.transactions("stripeCheckoutSessionId")
  WHERE "stripeCheckoutSessionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_paypal_order_idx
  ON public.transactions("paypalOrderId")
  WHERE "paypalOrderId" IS NOT NULL;

COMMIT;
