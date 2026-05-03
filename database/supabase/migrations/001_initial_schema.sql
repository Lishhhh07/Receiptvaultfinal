-- ReceiptVault initial schema
-- These CREATE TABLE statements mirror the deployed Supabase schema.
-- Run the full file in the Supabase SQL Editor on a fresh project,
-- OR run only the CREATE OR REPLACE FUNCTION block if tables already exist.

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text UNIQUE NOT NULL,
    email text,
    preferred_channel text NOT NULL DEFAULT 'whatsapp',
    quiet_hours_start time,
    quiet_hours_end time,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_name text,
    purchase_date timestamptz,
    total_amount numeric(10, 2),
    currency text NOT NULL DEFAULT 'INR',
    return_deadline timestamptz,
    warranty_expiry timestamptz,
    source text NOT NULL DEFAULT 'whatsapp_image',
    image_url text,
    gemini_raw jsonb,
    date_inferred boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    quantity numeric(10, 2) NOT NULL DEFAULT 1,
    unit_price numeric(10, 2),
    total_price numeric(10, 2),
    is_consumable boolean NOT NULL DEFAULT false,
    category text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    currency text NOT NULL DEFAULT 'INR',
    renewal_date timestamptz NOT NULL,
    billing_cycle text NOT NULL DEFAULT 'monthly',
    status text NOT NULL DEFAULT 'active',
    cancel_url text,
    source text NOT NULL DEFAULT 'gmail',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
    subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
    alert_type text NOT NULL,
    message text NOT NULL,
    channel text NOT NULL DEFAULT 'whatsapp',
    scheduled_at timestamptz NOT NULL,
    fired_at timestamptz,
    status text NOT NULL DEFAULT 'pending',
    bullmq_job_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receipt_item_id uuid REFERENCES receipt_items(id) ON DELETE SET NULL,
    item_name text NOT NULL,
    purchase_price numeric(10, 2) NOT NULL,
    current_price numeric(10, 2),
    currency text NOT NULL DEFAULT 'INR',
    drop_percent numeric(5, 2),
    sources jsonb,
    alert_sent boolean NOT NULL DEFAULT false,
    checked_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_return_deadline ON receipts(return_deadline);
CREATE INDEX IF NOT EXISTS idx_receipts_warranty_expiry ON receipts(warranty_expiry);
CREATE INDEX IF NOT EXISTS idx_receipts_purchase_date ON receipts(purchase_date);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_user_id ON receipt_items(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_name ON receipt_items(name);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_user_id ON alerts_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_scheduled_at ON alerts_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_status ON alerts_queue(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON subscriptions(renewal_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_price_history_user_id ON price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_receipt_item_id ON price_history(receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_name ON price_history(item_name);

CREATE OR REPLACE FUNCTION insert_receipt_with_items(
    p_user_id uuid,
    p_image_url text,
    p_store_name text,
    p_purchase_date timestamptz,
    p_total_amount numeric,
    p_currency text,
    p_return_deadline timestamptz,
    p_warranty_expiry timestamptz,
    p_date_inferred boolean,
    p_gemini_raw jsonb,
    p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    new_receipt_id uuid;
    elem jsonb;
BEGIN
    INSERT INTO receipts (
        user_id,
        image_url,
        store_name,
        purchase_date,
        total_amount,
        currency,
        return_deadline,
        warranty_expiry,
        date_inferred,
        gemini_raw,
        source
    )
    VALUES (
        p_user_id,
        p_image_url,
        p_store_name,
        p_purchase_date,
        p_total_amount,
        p_currency,
        p_return_deadline,
        p_warranty_expiry,
        COALESCE(p_date_inferred, false),
        p_gemini_raw,
        'whatsapp_image'
    )
    RETURNING id INTO new_receipt_id;

    FOR elem IN
        SELECT j FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS arr(j)
    LOOP
        INSERT INTO receipt_items (
            receipt_id,
            user_id,
            name,
            quantity,
            unit_price,
            total_price
        )
        VALUES (
            new_receipt_id,
            p_user_id,
            elem->>'name',
            COALESCE((elem->>'quantity')::numeric, 1),
            NULLIF(elem->>'unit_price', '')::numeric,
            NULLIF(elem->>'total_price', '')::numeric
        );
    END LOOP;

    RETURN new_receipt_id;
END;
$$;
