insert into users (id, phone)
values ('11111111-1111-1111-1111-111111111111', '+919999000001')
on conflict (phone) do nothing;

insert into receipts (id, user_id, merchant, receipt_date, total_amount)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'BigBasket', '2026-04-27', 1499.00),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'DMart', '2026-04-30', 890.00)
on conflict (id) do nothing;

insert into receipt_items (receipt_id, item_name, quantity, unit_price, category)
values
  ('22222222-2222-2222-2222-222222222221', 'Milk', 2, 35.00, 'groceries'),
  ('22222222-2222-2222-2222-222222222221', 'Dish Soap', 1, 120.00, 'household'),
  ('22222222-2222-2222-2222-222222222222', 'Rice', 5, 80.00, 'groceries');
