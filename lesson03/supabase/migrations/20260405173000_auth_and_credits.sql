create extension if not exists pgcrypto;

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 5 check (credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_credits enable row level security;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_user_credits_updated_at on public.user_credits;
create trigger set_user_credits_updated_at
before update on public.user_credits
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.ensure_user_credits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_credits integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.user_credits (user_id, credits)
  values (current_user_id, 5)
  on conflict (user_id) do nothing;

  select credits
  into current_credits
  from public.user_credits
  where user_id = current_user_id;

  return current_credits;
end;
$$;

create or replace function public.consume_credit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  remaining_credits integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.ensure_user_credits();

  update public.user_credits
  set credits = credits - 1
  where user_id = current_user_id and credits > 0
  returning credits into remaining_credits;

  if remaining_credits is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return remaining_credits;
end;
$$;

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 5)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
after insert on auth.users
for each row
execute function public.handle_new_user_credits();

drop policy if exists "Users can read their own credits" on public.user_credits;
create policy "Users can read their own credits"
on public.user_credits
for select
to authenticated
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select on public.user_credits to authenticated;
grant execute on function public.ensure_user_credits() to authenticated;
grant execute on function public.consume_credit() to authenticated;

-- TEMPORARY LOGIN REFILL START
-- Remove this function and its grant when login should stop refilling empty balances.
create or replace function public.temporarily_refill_credits_on_login_if_empty()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_credits integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  current_credits := public.ensure_user_credits();

  if current_credits <= 0 then
    update public.user_credits
    set credits = 5
    where user_id = current_user_id
    returning credits into current_credits;
  end if;

  return current_credits;
end;
$$;

grant execute on function public.temporarily_refill_credits_on_login_if_empty() to authenticated;
-- TEMPORARY LOGIN REFILL END
