-- NextShelf reviews and ratings. Run after 001 and 002.
-- Only customers who bought a product (paid or later) can review it.

alter table products add column if not exists rating_avg numeric(2,1) not null default 0;
alter table products add column if not exists rating_count int not null default 0;

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  author_name text not null,                       -- snapshot, e.g. "Aka D."
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)                     -- one review per buyer per product (editable)
);
create index reviews_product_idx on reviews (product_id, created_at desc);
create index reviews_recent_idx on reviews (created_at desc);

-- Did the signed-in user buy this product? (security definer so it can read orders safely)
create or replace function has_purchased(p_product uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from order_items oi
    join orders o on o.id = oi.order_id
    where oi.product_id = p_product
      and o.user_id = auth.uid()
      and o.status in ('paid', 'processing', 'shipped', 'delivered')
  );
$$;
revoke all on function has_purchased(uuid) from public, anon;
grant execute on function has_purchased(uuid) to authenticated;

-- Keep products.rating_avg / rating_count in sync so product cards stay one cheap query
create or replace function refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products p
  set rating_count = s.c, rating_avg = coalesce(s.a, 0)
  from (
    select count(*)::int as c, round(avg(rating)::numeric, 1) as a
    from reviews where product_id = pid
  ) s
  where p.id = pid;
  return null;
end $$;

create trigger reviews_rating
after insert or update or delete on reviews
for each row execute function refresh_product_rating();

alter table reviews enable row level security;

create policy "reviews public read" on reviews for select using (true);
create policy "reviews insert own purchased" on reviews for insert
  with check (user_id = auth.uid() and has_purchased(product_id));
create policy "reviews update own" on reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews delete own or admin" on reviews for delete
  using (user_id = auth.uid() or is_admin());
