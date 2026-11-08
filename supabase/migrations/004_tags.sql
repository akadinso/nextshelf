-- Product tags (used for the "Load-shedding ready" collection). Run after 003.
alter table products add column if not exists tags text[] not null default '{}';
create index if not exists products_tags_idx on products using gin (tags);
