alter table receipts
add column if not exists source_email_id text;

create unique index if not exists receipts_source_email_id_unique
on receipts (source_email_id)
where source_email_id is not null;

create index if not exists receipts_alert_sent_at_idx
on receipts (alert_sent_at);

create index if not exists subscriptions_alert_sent_at_idx
on subscriptions (alert_sent_at);
