-- DEMO ONLY: sample reviews so you can preview the stars and the testimonials section.
-- These are NOT from real customers. Delete them before you launch (last line).
-- Needs at least one signed-up user and the products from seed.sql.

do $$
declare uid uuid;
begin
  select id into uid from profiles order by created_at limit 1;
  if uid is null then
    raise notice 'Sign up on the site first, then run this again.';
    return;
  end if;

  insert into reviews (product_id, user_id, author_name, rating, body)
  select p.id, uid, v.author, v.rating, v.body
  from (values
    ('gravity-water-filter',     'Thando M.', 5, 'Sits on the kitchen counter and works fine during load shedding. Water tastes noticeably better than straight from the tap.'),
    ('clip-on-rechargeable-fan', 'Lerato K.', 5, 'Charged it from a power bank and it ran most of the evening. Small but a proper breeze.'),
    ('usb-bottle-dispenser',     'Pieter V.', 4, 'Easy to fit on a 19L bottle and the battery lasts well. Wish the button was a bit bigger.'),
    ('faucet-water-purifier',    'Aisha P.',  5, 'Fitted in two minutes without a plumber. Less of the chlorine smell now.'),
    ('usb-air-cooler',           'Sipho N.',  4, 'Good for my desk in summer. Fill the tank with cold water for the best effect.'),
    ('water-filter-pitcher',     'Naledi D.', 5, 'Fits in the fridge door and the family drinks more water now.')
  ) as v(slug, author, rating, body)
  join products p on p.slug = v.slug
  on conflict (product_id, user_id) do nothing;
end $$;

-- Remove the demo reviews:
-- delete from reviews where author_name in ('Thando M.','Lerato K.','Pieter V.','Aisha P.','Sipho N.','Naledi D.');