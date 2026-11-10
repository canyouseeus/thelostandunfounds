-- Money tab, round two: Venmo and Cash App spending, manual balances, Bitcoin.
--
-- 1. money_ledger.scope: every logged dollar is business or personal. Both
--    count toward cash and runway; only business counts toward profit and the
--    tax set-aside. Existing rows are business (they are all client income).
-- 2. money_accounts: balances the site cannot read (Venmo, Cash App), set by
--    hand with the date they were true. They add to spendable cash.
-- 3. bitcoin_activity: buys, sells, withdrawals and coins received, kept out of
--    money in/out so trading never reads as income or spending.
--
-- All three are read and written only by the admin API with the service role.

ALTER TABLE public.money_ledger
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'business';
DO $$ BEGIN
  ALTER TABLE public.money_ledger
    ADD CONSTRAINT money_ledger_scope_check CHECK (scope IN ('business', 'personal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON COLUMN public.money_ledger.scope IS 'business or personal. Both count in cash and runway; only business counts in profit and the tax set-aside.';

CREATE TABLE IF NOT EXISTS public.money_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.money_accounts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.money_accounts IS 'Balances set by hand (Venmo, Cash App) with the day they were true. Added to spendable cash on the money tab.';

CREATE TABLE IF NOT EXISTS public.bitcoin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_on DATE NOT NULL,
  platform TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'withdraw', 'receive', 'bonus')),
  usd_cents INTEGER NOT NULL DEFAULT 0 CHECK (usd_cents >= 0),
  fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  sats BIGINT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bitcoin_activity_source_ref_key
  ON public.bitcoin_activity (source, source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS bitcoin_activity_occurred_on_idx ON public.bitcoin_activity (occurred_on DESC);
ALTER TABLE public.bitcoin_activity ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.bitcoin_activity IS 'Bitcoin buys, sells, withdrawals and coins received. usd_cents is the trade amount before fees; fee_cents is what the platform kept.';
