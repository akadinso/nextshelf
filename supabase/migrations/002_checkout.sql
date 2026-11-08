-- NextShelf checkout: atomic order creation, stock reservation, payment confirmation.
-- Run after nextshelf_schema.sql. All three functions are service_role only.

-- Prevents the same payment webhook being recorded twice
create unique index if not exists payments_provider_ref_idx
  on payments (provider, provider_reference)
  where provider_reference is not null;

-- ---------------------------------------------------------------
-- create_order_from_cart
-- Reads the user's cart, prices everything from the DB (never from the client),
-- reserves stock, creates the order + items, and empties the cart.
-- The conditional UPDATE is the concurrency control: if two buyers race for the
-- last unit, the second waits on the row lock, re-checks, and fails cleanly.
-- ---------------------------------------------------------------
create or replace function create_order_from_cart(
  p_user_id uuid,
  p_email text,
  p_shipping_address jsonb,
  p_shipping_cents int default 0,
  p_notes text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_item record;
  v_name text;
  v_price int;
  v_variant_name text;
  v_subtotal int := 0;
begin
  if not exists (select 1 from cart_items where user_id = p_user_id) then
    raise exception 'CART_EMPTY';
  end if;

  insert into orders (user_id, email, subtotal_cents, shipping_cents, total_cents, shipping_address, notes)
  values (p_user_id, p_email, 0, p_shipping_cents, 0, p_shipping_address, p_notes)
  returning * into v_order;

  -- Fixed lock order across transactions avoids deadlocks
  for v_item in
    select product_id, variant_id, quantity
    from cart_items
    where user_id = p_user_id
    order by product_id, variant_id nulls first
  loop
    select name, price_cents into v_name, v_price
    from products
    where id = v_item.product_id and is_active;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE: %', v_item.product_id;
    end if;

    v_variant_name := null;

    if v_item.variant_id is null then
      update products
      set stock_quantity = stock_quantity - v_item.quantity
      where id = v_item.product_id and stock_quantity >= v_item.quantity;

      if not found then
        raise exception 'OUT_OF_STOCK: %', v_name;
      end if;
    else
      update product_variants
      set stock_quantity = stock_quantity - v_item.quantity
      where id = v_item.variant_id
        and product_id = v_item.product_id
        and stock_quantity >= v_item.quantity
      returning name, coalesce(price_cents, v_price)
      into v_variant_name, v_price;

      if not found then
        raise exception 'OUT_OF_STOCK: %', v_name;
      end if;
    end if;

    insert into order_items (order_id, product_id, variant_id, name, variant_name, unit_price_cents, quantity)
    values (v_order.id, v_item.product_id, v_item.variant_id, v_name, v_variant_name, v_price, v_item.quantity);

    v_subtotal := v_subtotal + v_price * v_item.quantity;
  end loop;

  update orders
  set subtotal_cents = v_subtotal,
      total_cents = v_subtotal + shipping_cents
  where id = v_order.id
  returning * into v_order;

  delete from cart_items where user_id = p_user_id;

  return v_order;
end $$;

-- ---------------------------------------------------------------
-- cancel_order: cancels a still-pending order and returns its stock.
-- Safe to call repeatedly (does nothing unless status = 'pending').
-- ---------------------------------------------------------------
create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  update orders set status = 'cancelled'
  where id = p_order_id and status = 'pending'
  returning id into v_id;

  if v_id is null then
    return;
  end if;

  update products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from order_items oi
  where oi.order_id = v_id and oi.variant_id is null and oi.product_id = p.id;

  update product_variants v
  set stock_quantity = v.stock_quantity + oi.quantity
  from order_items oi
  where oi.order_id = v_id and oi.variant_id = v.id;
end $$;

-- ---------------------------------------------------------------
-- confirm_payment: idempotent. Records the payment and marks the order paid.
-- Returns 'paid' | 'duplicate' | 'needs_review'
-- ('needs_review' = money arrived for an order that is no longer pending,
--  e.g. it expired and stock was released. Refund or fulfil manually.)
-- ---------------------------------------------------------------
create or replace function confirm_payment(
  p_order_id uuid,
  p_provider text,
  p_reference text,
  p_amount_cents int,
  p_payload jsonb
) returns text
language plpgsql security definer set search_path = public as $$
begin
  insert into payments (order_id, provider, provider_reference, amount_cents, status, raw_payload)
  values (p_order_id, p_provider, p_reference, p_amount_cents, 'complete', p_payload)
  on conflict (provider, provider_reference) where provider_reference is not null do nothing;

  if not found then
    return 'duplicate';
  end if;

  update orders set status = 'paid'
  where id = p_order_id and status = 'pending';

  if found then
    return 'paid';
  end if;

  return 'needs_review';
end $$;

-- ---------------------------------------------------------------
-- Lock these down: only the server (service role) may call them
-- ---------------------------------------------------------------
revoke all on function create_order_from_cart(uuid, text, jsonb, int, text) from public, anon, authenticated;
revoke all on function cancel_order(uuid) from public, anon, authenticated;
revoke all on function confirm_payment(uuid, text, text, int, jsonb) from public, anon, authenticated;

grant execute on function create_order_from_cart(uuid, text, jsonb, int, text) to service_role;
grant execute on function cancel_order(uuid) to service_role;
grant execute on function confirm_payment(uuid, text, text, int, jsonb) to service_role;

-- ---------------------------------------------------------------
-- Optional: release stock held by abandoned checkouts (needs pg_cron enabled
-- in Dashboard > Database > Extensions)
-- ---------------------------------------------------------------
-- select cron.schedule(
--   'expire-pending-orders', '*/10 * * * *',
--   $$ select cancel_order(id) from orders
--      where status = 'pending' and created_at < now() - interval '30 minutes' $$
-- );
