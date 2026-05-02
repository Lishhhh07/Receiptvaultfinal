drop extension if exists "pg_net";

create extension if not exists "vector" with schema "public";


  create table "public"."alerts_queue" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "receipt_id" uuid,
    "subscription_id" uuid,
    "alert_type" text not null,
    "message" text not null,
    "channel" text not null default 'whatsapp'::text,
    "scheduled_at" timestamp with time zone not null,
    "fired_at" timestamp with time zone,
    "status" text not null default 'pending'::text,
    "bullmq_job_id" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."alerts_queue" enable row level security;


  create table "public"."price_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "receipt_item_id" uuid,
    "item_name" text not null,
    "purchase_price" numeric(10,2) not null,
    "current_price" numeric(10,2),
    "currency" text not null default 'INR'::text,
    "drop_percent" numeric(5,2),
    "sources" jsonb,
    "alert_sent" boolean not null default false,
    "checked_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."price_history" enable row level security;


  create table "public"."receipt_items" (
    "id" uuid not null default gen_random_uuid(),
    "receipt_id" uuid not null,
    "user_id" uuid not null,
    "name" text not null,
    "quantity" numeric(10,2) not null default 1,
    "unit_price" numeric(10,2),
    "total_price" numeric(10,2),
    "is_consumable" boolean not null default false,
    "category" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."receipt_items" enable row level security;


  create table "public"."receipts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "store_name" text,
    "purchase_date" timestamp with time zone,
    "total_amount" numeric(10,2),
    "currency" text not null default 'INR'::text,
    "return_deadline" timestamp with time zone,
    "warranty_expiry" timestamp with time zone,
    "source" text not null default 'whatsapp_image'::text,
    "image_url" text,
    "gemini_raw" jsonb,
    "embedding" public.vector(768),
    "date_inferred" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."receipts" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "service_name" text not null,
    "amount" numeric(10,2) not null,
    "currency" text not null default 'INR'::text,
    "renewal_date" timestamp with time zone not null,
    "billing_cycle" text not null default 'monthly'::text,
    "status" text not null default 'active'::text,
    "cancel_url" text,
    "source" text not null default 'gmail'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "phone_number" text not null,
    "email" text,
    "preferred_channel" text not null default 'whatsapp'::text,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX alerts_queue_pkey ON public.alerts_queue USING btree (id);

CREATE INDEX idx_alerts_queue_scheduled_at ON public.alerts_queue USING btree (scheduled_at);

CREATE INDEX idx_alerts_queue_status ON public.alerts_queue USING btree (status);

CREATE INDEX idx_alerts_queue_user_id ON public.alerts_queue USING btree (user_id);

CREATE INDEX idx_price_history_item_name ON public.price_history USING btree (item_name);

CREATE INDEX idx_price_history_receipt_item_id ON public.price_history USING btree (receipt_item_id);

CREATE INDEX idx_price_history_user_id ON public.price_history USING btree (user_id);

CREATE INDEX idx_receipt_items_name ON public.receipt_items USING btree (name);

CREATE INDEX idx_receipt_items_receipt_id ON public.receipt_items USING btree (receipt_id);

CREATE INDEX idx_receipt_items_user_id ON public.receipt_items USING btree (user_id);

CREATE INDEX idx_receipts_embedding ON public.receipts USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_receipts_purchase_date ON public.receipts USING btree (purchase_date);

CREATE INDEX idx_receipts_return_deadline ON public.receipts USING btree (return_deadline);

CREATE INDEX idx_receipts_user_id ON public.receipts USING btree (user_id);

CREATE INDEX idx_receipts_warranty_expiry ON public.receipts USING btree (warranty_expiry);

CREATE INDEX idx_subscriptions_renewal_date ON public.subscriptions USING btree (renewal_date);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);

CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);

CREATE UNIQUE INDEX price_history_pkey ON public.price_history USING btree (id);

CREATE UNIQUE INDEX receipt_items_pkey ON public.receipt_items USING btree (id);

CREATE UNIQUE INDEX receipts_pkey ON public.receipts USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX users_phone_number_key ON public.users USING btree (phone_number);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."alerts_queue" add constraint "alerts_queue_pkey" PRIMARY KEY using index "alerts_queue_pkey";

alter table "public"."price_history" add constraint "price_history_pkey" PRIMARY KEY using index "price_history_pkey";

alter table "public"."receipt_items" add constraint "receipt_items_pkey" PRIMARY KEY using index "receipt_items_pkey";

alter table "public"."receipts" add constraint "receipts_pkey" PRIMARY KEY using index "receipts_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."alerts_queue" add constraint "alerts_queue_alert_type_check" CHECK ((alert_type = ANY (ARRAY['return_deadline'::text, 'warranty_expiry'::text, 'consumable_reorder'::text, 'subscription_renewal'::text, 'price_drop'::text]))) not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_alert_type_check";

alter table "public"."alerts_queue" add constraint "alerts_queue_channel_check" CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'telegram'::text, 'email'::text]))) not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_channel_check";

alter table "public"."alerts_queue" add constraint "alerts_queue_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_receipt_id_fkey";

alter table "public"."alerts_queue" add constraint "alerts_queue_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_status_check";

alter table "public"."alerts_queue" add constraint "alerts_queue_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_subscription_id_fkey";

alter table "public"."alerts_queue" add constraint "alerts_queue_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."alerts_queue" validate constraint "alerts_queue_user_id_fkey";

alter table "public"."price_history" add constraint "price_history_receipt_item_id_fkey" FOREIGN KEY (receipt_item_id) REFERENCES public.receipt_items(id) ON DELETE SET NULL not valid;

alter table "public"."price_history" validate constraint "price_history_receipt_item_id_fkey";

alter table "public"."price_history" add constraint "price_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."price_history" validate constraint "price_history_user_id_fkey";

alter table "public"."receipt_items" add constraint "receipt_items_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE not valid;

alter table "public"."receipt_items" validate constraint "receipt_items_receipt_id_fkey";

alter table "public"."receipt_items" add constraint "receipt_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."receipt_items" validate constraint "receipt_items_user_id_fkey";

alter table "public"."receipts" add constraint "receipts_source_check" CHECK ((source = ANY (ARRAY['whatsapp_image'::text, 'gmail'::text, 'manual'::text]))) not valid;

alter table "public"."receipts" validate constraint "receipts_source_check";

alter table "public"."receipts" add constraint "receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."receipts" validate constraint "receipts_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_billing_cycle_check" CHECK ((billing_cycle = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_billing_cycle_check";

alter table "public"."subscriptions" add constraint "subscriptions_source_check" CHECK ((source = ANY (ARRAY['gmail'::text, 'manual'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_source_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancel_requested'::text, 'cancelled'::text, 'paused'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."users" add constraint "users_phone_number_key" UNIQUE using index "users_phone_number_key";

alter table "public"."users" add constraint "users_preferred_channel_check" CHECK ((preferred_channel = ANY (ARRAY['whatsapp'::text, 'telegram'::text, 'email'::text]))) not valid;

alter table "public"."users" validate constraint "users_preferred_channel_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."alerts_queue" to "anon";

grant insert on table "public"."alerts_queue" to "anon";

grant references on table "public"."alerts_queue" to "anon";

grant select on table "public"."alerts_queue" to "anon";

grant trigger on table "public"."alerts_queue" to "anon";

grant truncate on table "public"."alerts_queue" to "anon";

grant update on table "public"."alerts_queue" to "anon";

grant delete on table "public"."alerts_queue" to "authenticated";

grant insert on table "public"."alerts_queue" to "authenticated";

grant references on table "public"."alerts_queue" to "authenticated";

grant select on table "public"."alerts_queue" to "authenticated";

grant trigger on table "public"."alerts_queue" to "authenticated";

grant truncate on table "public"."alerts_queue" to "authenticated";

grant update on table "public"."alerts_queue" to "authenticated";

grant delete on table "public"."alerts_queue" to "service_role";

grant insert on table "public"."alerts_queue" to "service_role";

grant references on table "public"."alerts_queue" to "service_role";

grant select on table "public"."alerts_queue" to "service_role";

grant trigger on table "public"."alerts_queue" to "service_role";

grant truncate on table "public"."alerts_queue" to "service_role";

grant update on table "public"."alerts_queue" to "service_role";

grant delete on table "public"."price_history" to "anon";

grant insert on table "public"."price_history" to "anon";

grant references on table "public"."price_history" to "anon";

grant select on table "public"."price_history" to "anon";

grant trigger on table "public"."price_history" to "anon";

grant truncate on table "public"."price_history" to "anon";

grant update on table "public"."price_history" to "anon";

grant delete on table "public"."price_history" to "authenticated";

grant insert on table "public"."price_history" to "authenticated";

grant references on table "public"."price_history" to "authenticated";

grant select on table "public"."price_history" to "authenticated";

grant trigger on table "public"."price_history" to "authenticated";

grant truncate on table "public"."price_history" to "authenticated";

grant update on table "public"."price_history" to "authenticated";

grant delete on table "public"."price_history" to "service_role";

grant insert on table "public"."price_history" to "service_role";

grant references on table "public"."price_history" to "service_role";

grant select on table "public"."price_history" to "service_role";

grant trigger on table "public"."price_history" to "service_role";

grant truncate on table "public"."price_history" to "service_role";

grant update on table "public"."price_history" to "service_role";

grant delete on table "public"."receipt_items" to "anon";

grant insert on table "public"."receipt_items" to "anon";

grant references on table "public"."receipt_items" to "anon";

grant select on table "public"."receipt_items" to "anon";

grant trigger on table "public"."receipt_items" to "anon";

grant truncate on table "public"."receipt_items" to "anon";

grant update on table "public"."receipt_items" to "anon";

grant delete on table "public"."receipt_items" to "authenticated";

grant insert on table "public"."receipt_items" to "authenticated";

grant references on table "public"."receipt_items" to "authenticated";

grant select on table "public"."receipt_items" to "authenticated";

grant trigger on table "public"."receipt_items" to "authenticated";

grant truncate on table "public"."receipt_items" to "authenticated";

grant update on table "public"."receipt_items" to "authenticated";

grant delete on table "public"."receipt_items" to "service_role";

grant insert on table "public"."receipt_items" to "service_role";

grant references on table "public"."receipt_items" to "service_role";

grant select on table "public"."receipt_items" to "service_role";

grant trigger on table "public"."receipt_items" to "service_role";

grant truncate on table "public"."receipt_items" to "service_role";

grant update on table "public"."receipt_items" to "service_role";

grant delete on table "public"."receipts" to "anon";

grant insert on table "public"."receipts" to "anon";

grant references on table "public"."receipts" to "anon";

grant select on table "public"."receipts" to "anon";

grant trigger on table "public"."receipts" to "anon";

grant truncate on table "public"."receipts" to "anon";

grant update on table "public"."receipts" to "anon";

grant delete on table "public"."receipts" to "authenticated";

grant insert on table "public"."receipts" to "authenticated";

grant references on table "public"."receipts" to "authenticated";

grant select on table "public"."receipts" to "authenticated";

grant trigger on table "public"."receipts" to "authenticated";

grant truncate on table "public"."receipts" to "authenticated";

grant update on table "public"."receipts" to "authenticated";

grant delete on table "public"."receipts" to "service_role";

grant insert on table "public"."receipts" to "service_role";

grant references on table "public"."receipts" to "service_role";

grant select on table "public"."receipts" to "service_role";

grant trigger on table "public"."receipts" to "service_role";

grant truncate on table "public"."receipts" to "service_role";

grant update on table "public"."receipts" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "service role full access"
  on "public"."alerts_queue"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "service role full access"
  on "public"."price_history"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "service role full access"
  on "public"."receipt_items"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "service role full access"
  on "public"."receipts"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "service role full access"
  on "public"."subscriptions"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "service role full access"
  on "public"."users"
  as permissive
  for all
  to public
using (true)
with check (true);


CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


