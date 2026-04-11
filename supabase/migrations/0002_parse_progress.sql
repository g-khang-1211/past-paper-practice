alter table public.papers
add column if not exists parsed_pages_count integer not null default 0;

alter table public.papers
add column if not exists parse_progress_pct integer not null default 0
check (parse_progress_pct >= 0 and parse_progress_pct <= 100);

with page_counts as (
  select paper_id, count(*)::integer as parsed_pages_count
  from public.paper_pages
  group by paper_id
)
update public.papers p
set
  parsed_pages_count = coalesce(pc.parsed_pages_count, 0),
  parse_progress_pct = case
    when p.parse_status = 'ready' then 100
    when coalesce(p.page_count, 0) > 0 then least(
      100,
      greatest(
        0,
        round((coalesce(pc.parsed_pages_count, 0)::numeric / nullif(p.page_count, 0)::numeric) * 100)::integer
      )
    )
    else 0
  end
from page_counts pc
where p.id = pc.paper_id;

update public.papers
set
  parsed_pages_count = case
    when parse_status = 'ready' and page_count is not null then page_count
    else parsed_pages_count
  end,
  parse_progress_pct = case
    when parse_status = 'ready' and page_count is not null then 100
    else parse_progress_pct
  end
where parse_status = 'ready';
