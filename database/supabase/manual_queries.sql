-- 1) Fetch all receipts
select *
from receipts
order by receipt_date desc;

-- 2) Filter receipts by date range
select id, merchant, receipt_date, total_amount
from receipts
where receipt_date between '2026-04-01' and '2026-04-30'
order by receipt_date desc;

-- 3) Sum spending by category
select
  coalesce(ri.category, 'uncategorized') as category,
  sum(ri.quantity * ri.unit_price) as category_total
from receipt_items ri
join receipts r on r.id = ri.receipt_id
group by coalesce(ri.category, 'uncategorized')
order by category_total desc;
