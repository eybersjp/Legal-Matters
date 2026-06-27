-- Create expenses and payments tables
-- Enforces row-level security with explicit USING and WITH CHECK policies.

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    amount_zar NUMERIC(12, 2) NOT NULL CHECK (amount_zar >= 0.00),
    description TEXT NOT NULL,
    is_billed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0.00),
    payment_method TEXT NOT NULL,
    transaction_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Define policies for public.expenses
CREATE POLICY expenses_select ON public.expenses
    FOR SELECT USING (firm_id = get_auth_firm_id());

CREATE POLICY expenses_insert ON public.expenses
    FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY expenses_update ON public.expenses
    FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY expenses_delete ON public.expenses
    FOR DELETE USING (firm_id = get_auth_firm_id());

-- 5. Define policies for public.payments
CREATE POLICY payments_select ON public.payments
    FOR SELECT USING (firm_id = get_auth_firm_id());

CREATE POLICY payments_insert ON public.payments
    FOR INSERT WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY payments_update ON public.payments
    FOR UPDATE USING (firm_id = get_auth_firm_id()) WITH CHECK (firm_id = get_auth_firm_id());

CREATE POLICY payments_delete ON public.payments
    FOR DELETE USING (firm_id = get_auth_firm_id());

-- 6. Add default grants
GRANT ALL ON TABLE public.expenses TO postgres;
GRANT ALL ON TABLE public.expenses TO service_role;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO anon;

GRANT ALL ON TABLE public.payments TO postgres;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO anon;
