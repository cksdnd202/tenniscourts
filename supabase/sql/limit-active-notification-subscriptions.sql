-- 사용자 한 명이 활성화할 수 있는 예약 알림을 30개로 제한합니다.
-- 하루 전(1440분)과 10분 전은 각각 별도 알림 1개로 계산됩니다.

create or replace function public.enforce_notification_subscription_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_subscription_count integer;
  same_subscription_is_active boolean;
begin
  if new.is_enabled is not true then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_enabled is true then
    return new;
  end if;

  -- 같은 사용자의 동시 등록을 직렬화해 30개 제한을 우회하지 못하게 합니다.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if tg_op = 'INSERT' then
    select exists (
      select 1
      from public.notification_subscriptions as existing
      where existing.user_id = new.user_id
        and existing.booking_rule_id = new.booking_rule_id
        and existing.lead_minutes = new.lead_minutes
        and existing.is_enabled = true
    ) into same_subscription_is_active;

    -- 이미 활성화된 동일 알림을 upsert하는 것은 새 알림 추가가 아닙니다.
    if same_subscription_is_active then
      return new;
    end if;
  end if;

  select count(*)
  into active_subscription_count
  from public.notification_subscriptions as subscription
  where subscription.user_id = new.user_id
    and subscription.is_enabled = true;

  if active_subscription_count >= 30 then
    raise exception using
      errcode = 'P0001',
      message = 'notification_subscription_limit_reached',
      detail = 'A user can have at most 30 active notification subscriptions.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_notification_subscription_limit_trigger
  on public.notification_subscriptions;

create trigger enforce_notification_subscription_limit_trigger
before insert or update of is_enabled
on public.notification_subscriptions
for each row
execute function public.enforce_notification_subscription_limit();

revoke all on function public.enforce_notification_subscription_limit() from public, anon, authenticated;
grant execute on function public.enforce_notification_subscription_limit() to service_role;
