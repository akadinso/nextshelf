-- International delivery and billing addresses. Run after 004.
alter table addresses add column if not exists country text not null default 'ZA';
alter table orders add column if not exists billing_address jsonb;
