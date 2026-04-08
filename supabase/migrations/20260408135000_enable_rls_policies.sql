begin;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_channel(target_channel_key text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.conversation_channels cc
    join public.conversation_members cm
      on cm.conversation_id = cc.conversation_id
    where cc.channel_key = target_channel_key
      and cm.user_id = auth.uid()
  );
$$;

alter table public.users enable row level security;
alter table public.chat_messages enable row level security;
alter table public.conversations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.notifications enable row level security;
alter table public.connection_requests enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.conversation_channels enable row level security;
alter table public.conversation_members enable row level security;
alter table public.revoked_tokens enable row level security;
alter table public.user_activities enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_update_own" on public.users;
create policy "users_select_authenticated"
on public.users
for select
to authenticated
using (true);
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "user_profiles_select_authenticated" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_select_authenticated"
on public.user_profiles
for select
to authenticated
using (true);
create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "chat_messages_select_member_channels" on public.chat_messages;
drop policy if exists "chat_messages_insert_own_member_channels" on public.chat_messages;
create policy "chat_messages_select_member_channels"
on public.chat_messages
for select
to authenticated
using (public.can_access_channel(channel));
create policy "chat_messages_insert_own_member_channels"
on public.chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_access_channel(channel)
);

drop policy if exists "conversations_select_member_only" on public.conversations;
create policy "conversations_select_member_only"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id));

drop policy if exists "conversation_members_select_shared_conversations" on public.conversation_members;
create policy "conversation_members_select_shared_conversations"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "conversation_channels_select_member_only" on public.conversation_channels;
create policy "conversation_channels_select_member_only"
on public.conversation_channels
for select
to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
to authenticated
using (user_id = auth.uid());
create policy "user_settings_insert_own"
on public.user_settings
for insert
to authenticated
with check (user_id = auth.uid());
create policy "user_settings_update_own"
on public.user_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "user_settings_delete_own"
on public.user_settings
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "watchlist_items_select_own" on public.watchlist_items;
drop policy if exists "watchlist_items_insert_own" on public.watchlist_items;
drop policy if exists "watchlist_items_update_own" on public.watchlist_items;
drop policy if exists "watchlist_items_delete_own" on public.watchlist_items;
create policy "watchlist_items_select_own"
on public.watchlist_items
for select
to authenticated
using (user_id = auth.uid());
create policy "watchlist_items_insert_own"
on public.watchlist_items
for insert
to authenticated
with check (user_id = auth.uid());
create policy "watchlist_items_update_own"
on public.watchlist_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "watchlist_items_delete_own"
on public.watchlist_items
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());
create policy "notifications_insert_own"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid());
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "connection_requests_select_sent_or_received" on public.connection_requests;
drop policy if exists "connection_requests_insert_requester_only" on public.connection_requests;
drop policy if exists "connection_requests_update_sent_or_received" on public.connection_requests;
create policy "connection_requests_select_sent_or_received"
on public.connection_requests
for select
to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());
create policy "connection_requests_insert_requester_only"
on public.connection_requests
for insert
to authenticated
with check (requester_id = auth.uid());
create policy "connection_requests_update_sent_or_received"
on public.connection_requests
for update
to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid())
with check (requester_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "market_snapshots_select_authenticated" on public.market_snapshots;
create policy "market_snapshots_select_authenticated"
on public.market_snapshots
for select
to authenticated
using (true);

revoke all on public.revoked_tokens from authenticated, anon;
revoke all on public.user_activities from authenticated, anon;

commit;
