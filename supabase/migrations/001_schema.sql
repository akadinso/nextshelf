-- NextShelf schema (Supabase / Postgres)
-- Single-store version of the HubConnect structure: profiles + roles, catalogue,
-- cart, favourites, orders, payments. Prices are stored in cents (ZAR).

-- ========== ENUMS ==========
create type user_role as enum ('customer', 'admin');
create type order_status as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type payment_status as enum ('pending', 'complete', 'failed', 'refunded');

-- ========== HELPERS ==========
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ========== PROFILES ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  onboarded boolean not null default false,   -- drives the post-sign-up onboarding redirect
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Admin check used by RLS policies (security definer avoids policy recursion)
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ========== CATALOGUE ==========
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_cents int not null check (price_cents >= 0),
  compare_at_price_cents int check (compare_at_price_cents >= 0),  -- "was" price for sales
  sku text unique,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  images text[] not null default '{}',        -- Supabase Storage URLs
  is_active boolean not null default true,
  is_featured boolean not null default false, -- "Recommended" carousel
  created_at timestamptz not null default now(),  -- "New arrivals" carousel
  updated_at timestamptz not null default now()
);
create index products_category_idx on products(category_id);
create index products_active_created_idx on products(is_active, created_at desc);
create trigger products_updated before update on products
  for each row execute function set_updated_at();

-- Optional: sizes, colours, etc.
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,                          -- e.g. "Large / Black"
  sku text unique,
  price_cents int check (price_cents >= 0),    -- null = use product price
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now()
);
create index variants_product_idx on product_variants(product_id);

-- ========== CART & FAVOURITES ==========
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, product_id, variant_id)
);

create table favourites (
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ========== ADDRESSES ==========
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,                                  -- "Home", "Work"
  recipient_name text not null,
  phone text,
  street text not null,
  suburb text,
  city text not null,
  province text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on addresses(user_id);

-- ========== ORDERS ==========
create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('order_number_seq'),
  user_id uuid references profiles(id) on delete set null,
  email text not null,
  status order_status not null default 'pending',
  currency text not null default 'ZAR',
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  shipping_address jsonb not null,             -- snapshot, so later edits don't change old orders
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders(user_id, created_at desc);
create index orders_status_idx on orders(status);
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  name text not null,                          -- snapshot of product name
  variant_name text,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0)
);
create index order_items_order_idx on order_items(order_id);

-- ========== PAYMENTS (PayFast / Stripe / etc.) ==========
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,                      -- 'payfast', 'stripe', ...
  provider_reference text,                     -- e.g. PayFast pf_payment_id
  amount_cents int not null check (amount_cents >= 0),
  status payment_status not null default 'pending',
  raw_payload jsonb,                           -- webhook / ITN body for debugging
  created_at timestamptz not null default now()
);
create index payments_order_idx on payments(order_id);

-- ========== ROW LEVEL SECURITY ==========
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table cart_items enable row level security;
alter table favourites enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;

-- profiles
create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));  -- can't self-promote

-- catalogue: public read, admin write
create policy "categories public read" on categories for select using (true);
create policy "categories admin write" on categories for all using (is_admin()) with check (is_admin());

create policy "products public read" on products for select using (is_active or is_admin());
create policy "products admin write" on products for all using (is_admin()) with check (is_admin());

create policy "variants public read" on product_variants for select using (true);
create policy "variants admin write" on product_variants for all using (is_admin()) with check (is_admin());

-- cart, favourites, addresses: owner only
create policy "own cart" on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favourites" on favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders & payments: customers read their own; admins manage everything.
-- Orders and payments are INSERTED/UPDATED server-side with the service role
-- (checkout route + payment webhook), so there are no customer write policies.
create policy "own orders read" on orders for select using (user_id = auth.uid() or is_admin());
create policy "admin orders write" on orders for update using (is_admin());

create policy "own order items read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));

create policy "own payments read" on payments for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));

-- ========== STORAGE (run in dashboard or via SQL) ==========
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
-- Then add a storage policy so only admins can upload to that bucket.

-- ========== FIRST ADMIN ==========
-- After you sign up, promote yourself:
-- update profiles set role = 'admin' where id = '<your auth user id>';
