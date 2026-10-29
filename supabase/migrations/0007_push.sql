-- =====================================================================
-- ProdTrack — jetons push et envoi via Edge Function (pg_net)
-- =====================================================================

create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  profil_id   uuid not null references public.profils(id) on delete cascade,
  jeton       text not null unique,
  plateforme  text check (plateforme in ('ios', 'android')),
  created_at  timestamptz not null default now(),
  vu_le       timestamptz not null default now()
);

create index push_tokens_profil on public.push_tokens (profil_id);

alter table public.push_tokens enable row level security;

create policy push_tokens_select on public.push_tokens for select
  using (profil_id = auth.uid());

create policy push_tokens_insert on public.push_tokens for insert
  with check (profil_id = auth.uid());

create policy push_tokens_update on public.push_tokens for update
  using (profil_id = auth.uid())
  with check (profil_id = auth.uid());

create policy push_tokens_delete on public.push_tokens for delete
  using (profil_id = auth.uid());

-- Upsert qui peut reprendre un jeton d'un autre profil (tablette partagée).
create or replace function public.enregistrer_jeton_push(p_jeton text, p_plateforme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'non authentifié';
  end if;
  if p_jeton is null or length(trim(p_jeton)) = 0 then
    raise exception 'jeton invalide';
  end if;
  if p_plateforme is distinct from 'ios' and p_plateforme is distinct from 'android' then
    raise exception 'plateforme invalide';
  end if;

  insert into public.push_tokens (profil_id, jeton, plateforme, vu_le)
  values (auth.uid(), p_jeton, p_plateforme, now())
  on conflict (jeton) do update
    set profil_id = auth.uid(),
        plateforme = excluded.plateforme,
        vu_le = now();
end;
$$;

create or replace function public.supprimer_jeton_push(p_jeton text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'non authentifié';
  end if;
  delete from public.push_tokens
  where jeton = p_jeton
    and profil_id = auth.uid();
end;
$$;

revoke all on function public.enregistrer_jeton_push(text, text) from public;
revoke all on function public.supprimer_jeton_push(text) from public;
revoke execute on function public.enregistrer_jeton_push(text, text) from anon;
revoke execute on function public.supprimer_jeton_push(text) from anon;
grant execute on function public.enregistrer_jeton_push(text, text) to authenticated;
grant execute on function public.supprimer_jeton_push(text) to authenticated;

alter table public.notifications
  add column push_envoye_le timestamptz;

create extension if not exists pg_net with schema extensions;

create or replace function public.notifier_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://oqltjrtiwqpzkuoucczq.supabase.co/functions/v1/envoyer-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
end;
$$;

create trigger notifications_apres_insert_push
  after insert on public.notifications
  for each row
  execute function public.notifier_push();
