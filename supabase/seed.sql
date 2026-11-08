-- ClearCurrent sample catalogue: water filters, dispensers and cooling for South Africa.
-- Run in the Supabase SQL editor AFTER 001, 002, 003 and 004.
--
-- THIS REPLACES THE SAMPLE DATA. It first deletes the earlier sample products and categories
-- (the clothing/apparel set AND any earlier version of this water set), then loads the catalogue
-- again. Any edits you made to those sample products are lost, and so are their demo reviews
-- (run seed_reviews.sql again afterwards if you want them). Your own real products are untouched
-- as long as they do not use the sample SKUs below.
--
-- Prices are launch placeholders in rands (cents in the DB). Re-price each product from your
-- real landed cost (supplier price + shipping to SA + payment fees) before you go live.
-- Images are placeholder photos: replace them with your supplier photos in /admin/products.
-- Stock numbers are placeholders too. Dropshipped items depend on your supplier's stock.

-- ========== 0. REMOVE EARLIER SAMPLE DATA ==========
delete from products where sku in (
  -- earlier apparel sample
  'TEE-001','TEE-002','TEE-003','HOOD-001','HOOD-002','BAG-001','BAG-002',
  'CAP-001','MUG-001','MUG-002','CAN-001','CAN-002',
  -- this water and cooling sample (so re-running replaces it)
  'GF-001','GF-002','TF-001','TF-002','JB-001','JB-002','RC-001','RC-002','RC-003','WQ-001',
  'DS-001','DS-002','DS-003','RF-001','RF-002','RF-003','AC-001'
);
delete from categories where slug in (
  't-shirts','hoodies','bags','caps','mugs','candles','clothing','accessories','home',
  'gravity-filters','tap-shower-filters','jugs-bottles','cartridges','rechargeable-fans','air-coolers',
  'water-filters','dispensers-storage','cooling'
);

-- ========== 1. CATEGORIES ==========
insert into categories (name, slug, sort_order) values
  ('Water Filters',         'water-filters',      1),
  ('Dispensers & Storage',  'dispensers-storage', 2),
  ('Cooling & Fans',        'cooling',            3)
on conflict (slug) do nothing;

insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, p.id, v.sort_order
from (values
  ('Gravity Filters (No Power)', 'gravity-filters',     'water-filters', 1),
  ('Tap & Shower Filters',       'tap-shower-filters',  'water-filters', 2),
  ('Jugs & Bottles',             'jugs-bottles',        'water-filters', 3),
  ('Replacement Cartridges',     'cartridges',          'water-filters', 4),
  ('Rechargeable Fans',          'rechargeable-fans',   'cooling',       1),
  ('Air Coolers',                'air-coolers',         'cooling',       2)
) as v(name, slug, parent_slug, sort_order)
join categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;

-- ========== 2. PRODUCTS ==========
-- Products that have variants (sizes / colours) track stock on the variants, so their own stock is 0.
insert into products
  (category_id, name, slug, description, price_cents, compare_at_price_cents, sku, stock_quantity, is_featured, tags, images)
select c.id, v.name, v.slug, v.description, v.price_cents, v.compare_at, v.sku, v.stock, v.featured, v.tags,
       array[ 'https://picsum.photos/seed/' || v.slug || '-1/800/800',
              'https://picsum.photos/seed/' || v.slug || '-2/800/800' ]
from (values
  -- ---- Gravity filters: no electricity, ideal for load shedding and water outages
  ('gravity-filters','Stainless Steel Gravity Water Filter','gravity-water-filter',
   E'Countertop gravity-fed filter with two ceramic filter elements and a stainless steel tap. No electricity and no plumbing needed, so it keeps working during load shedding. Pour water into the top tank and clean filtered water collects in the bottom tank.\n\nPowered by: gravity (no mains power).\nNot a substitute for treating water that is unsafe to drink. Follow the cleaning and replacement guidance in the box.',
   179900, 219900, 'GF-001', 0, true, array['load-shedding']::text[]),
  ('gravity-filters','Portable Gravity Filter Bag (Camping & Emergency)','portable-gravity-filter-bag',
   E'Hang-up gravity filter bag for camping, hiking and emergency water storage at home. Fill the bag, hang it up and let gravity do the work.\n\nPowered by: gravity (no mains power).\nCapacity depends on the size you choose.',
   74900, NULL, 'GF-002', 40, false, array['load-shedding']::text[]),

  -- ---- Tap and shower filters
  ('tap-shower-filters','Faucet Water Purifier (Kitchen Tap Filter)','faucet-water-purifier',
   E'Clip-on tap filter that fits most standard kitchen taps. Uses a replaceable cartridge to reduce chlorine, sediment and odours in your tap water. Fits in minutes without tools or a plumber.\n\nPowered by: your tap pressure (no electricity).',
   29900, 39900, 'TF-001', 80, true, '{}'::text[]),
  ('tap-shower-filters','Shower Head Filter (Chlorine Reducing)','shower-filter',
   E'Screw-on shower filter with a replaceable cartridge that reduces chlorine. Fits standard shower arms.\n\nPowered by: water pressure (no electricity).',
   19900, NULL, 'TF-002', 60, false, '{}'::text[]),

  -- ---- Jugs and bottles
  ('jugs-bottles','Water Filter Pitcher 3.5L','water-filter-pitcher',
   E'Fridge-sized jug with a replaceable filter cartridge. Fill the top, and filtered water collects in the jug. Great for everyday drinking water.\n\nPowered by: gravity (no electricity).',
   44900, 54900, 'JB-001', 50, true, array['load-shedding']::text[]),
  ('jugs-bottles','Filter Water Bottle 600ml','filter-water-bottle',
   E'Reusable bottle with a built-in filter for taps, travel and the gym. BPA-free body.\n\nPowered by: you (no electricity).',
   22900, NULL, 'JB-002', 70, false, array['load-shedding']::text[]),

  -- ---- Replacement cartridges (repeat purchases)
  ('cartridges','Ceramic Candle Filters (2-Pack)','ceramic-candle-filters',
   E'Replacement ceramic filter elements for gravity water filters. Soak and clean before first use as per the instructions. Check that the size matches your filter before ordering.',
   24900, NULL, 'RC-001', 60, false, '{}'::text[]),
  ('cartridges','Pitcher Replacement Cartridges (3-Pack)','pitcher-replacement-cartridges',
   E'Replacement cartridges for the 3.5L Water Filter Pitcher. Replace regularly for the best taste and flow.',
   19900, NULL, 'RC-002', 80, false, '{}'::text[]),
  ('cartridges','Faucet Filter Replacement Cartridges (3-Pack)','faucet-filter-cartridges',
   E'Replacement cartridges for the Faucet Water Purifier. Replace regularly for the best results.',
   12900, NULL, 'RC-003', 80, false, '{}'::text[]),

  -- ---- Water quality tool
  ('water-filters','TDS Water Quality Meter','tds-meter',
   E'Handheld digital meter that shows the total dissolved solids (TDS) in your water. Useful for checking how your filter is performing over time.\n\nPowered by: batteries (included).\nTDS only measures dissolved minerals and salts. It does not tell you whether water is safe to drink.',
   15900, NULL, 'WQ-001', 60, false, '{}'::text[]),

  -- ---- Dispensers and storage
  ('dispensers-storage','Rechargeable Desk Water Bottle Dispenser (USB)','usb-bottle-dispenser',
   E'Automatic electric pump that screws onto a 5L to 19L water bottle. Press the button to dispense. Built-in rechargeable battery charges over USB, so it works during load shedding and can be topped up from a power bank.\n\nPowered by: built-in rechargeable battery (USB charging).',
   22900, 29900, 'DS-001', 0, true, array['load-shedding']::text[]),
  ('dispensers-storage','Manual Hand Press Pump for Water Bottles','bottle-hand-pump',
   E'Simple press-down pump for 5L to 20L bottles. No batteries, no charging, no electricity. A reliable backup to keep next to your electric dispenser.\n\nPowered by: hand pressure.',
   11900, NULL, 'DS-002', 80, false, array['load-shedding']::text[]),
  ('dispensers-storage','Foldable 20L Water Carrier with Tap','foldable-water-carrier',
   E'Collapsible water container with a tap, handy for water outages, camping and braais. Folds flat when empty.\n\nIntended for storing clean drinking water. Rinse before first use.',
   21900, NULL, 'DS-003', 50, false, array['load-shedding']::text[]),

  -- ---- Rechargeable fans
  ('rechargeable-fans','Rechargeable Clip-On Fan (USB, 3-Speed)','clip-on-rechargeable-fan',
   E'Compact clip-on fan with a built-in battery. Clip it to a desk, bed frame or pram, and charge it over USB from a wall adapter, laptop or power bank. Three speeds.\n\nPowered by: built-in rechargeable battery (USB charging).',
   24900, 29900, 'RF-001', 0, true, array['load-shedding']::text[]),
  ('rechargeable-fans','Foldable Rechargeable Floor Fan with LED Light','foldable-floor-fan-led',
   E'Foldable standing fan with a built-in battery and an LED light. Handy as a bedroom or office fan and as a light when the power goes off. Charges over USB.\n\nPowered by: built-in rechargeable battery (USB charging).',
   64900, 79900, 'RF-002', 35, true, array['load-shedding']::text[]),
  ('rechargeable-fans','Rechargeable Neck Fan (Hands-Free)','neck-fan',
   E'Wearable bladeless neck fan with a built-in battery. Keeps your hands free while you cook, commute or work. Charges over USB.\n\nPowered by: built-in rechargeable battery (USB charging).',
   22900, NULL, 'RF-003', 0, false, array['load-shedding']::text[]),

  -- ---- Air coolers
  ('air-coolers','Portable USB Air Cooler with Humidifier','usb-air-cooler',
   E'Personal air cooler with a water tank, fan and mist function plus a timer. It cools the air right around you, best used on a desk or bedside table. It is not a replacement for an air conditioner and works best in dry air.\n\nPowered by: USB (wall adapter or power bank).',
   54900, 69900, 'AC-001', 0, true, array['load-shedding']::text[])
) as v(cat_slug, name, slug, description, price_cents, compare_at, sku, stock, featured, tags)
join categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ========== 3. VARIANTS (sizes / colours) ==========
-- A NULL price means "use the product price".
insert into product_variants (product_id, name, price_cents, stock_quantity)
select p.id, v.name, v.price_cents, v.stock
from (values
  ('gravity-water-filter',       '8L',             149900::int, 20),
  ('gravity-water-filter',       '12L',            NULL,        25),
  ('gravity-water-filter',       '16L',            219900,      15),
  ('portable-gravity-filter-bag','3L',             NULL,        20),
  ('portable-gravity-filter-bag','6L',             94900,       15),
  ('usb-bottle-dispenser',       'White',          NULL,        40),
  ('usb-bottle-dispenser',       'Black',          NULL,        40),
  ('clip-on-rechargeable-fan',   'White',          NULL,        30),
  ('clip-on-rechargeable-fan',   'Grey',           NULL,        30),
  ('neck-fan',                   'Black',          NULL,        25),
  ('neck-fan',                   'White',          NULL,        25),
  ('neck-fan',                   'Pink',           NULL,        0),
  ('usb-air-cooler',             'White',          NULL,        30),
  ('usb-air-cooler',             'Blue',           NULL,        30)
) as v(slug, name, price_cents, stock)
join products p on p.slug = v.slug
where not exists (
  select 1 from product_variants pv where pv.product_id = p.id and pv.name = v.name
);

-- To remove this sample data later, run section 0 above on its own.
