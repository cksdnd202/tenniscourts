create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      '사용자'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', ''),
      nullif(new.raw_user_meta_data ->> 'profile_image', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_user_created on auth.users;

create trigger create_profile_after_user_created
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

insert into public.profiles (id, display_name, avatar_url)
select
  users.id,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'preferred_username', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'nickname', ''),
    nullif(users.raw_user_meta_data ->> 'user_name', ''),
    split_part(coalesce(users.email, ''), '@', 1),
    '사용자'
  ) as display_name,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(users.raw_user_meta_data ->> 'picture', ''),
    nullif(users.raw_user_meta_data ->> 'profile_image', '')
  ) as avatar_url
from auth.users as users
left join public.profiles as profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;
