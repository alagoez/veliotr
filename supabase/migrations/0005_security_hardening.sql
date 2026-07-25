-- Güvenlik denetimi düzeltmeleri (2026-07-25)

-- ── 1) profiles: kullanıcı kendi 'plan' ve 'stripe_customer_id' alanını yazamasın
-- Eski politika "for all" idi; with check yalnızca HANGİ SATIRA dokunulduğunu
-- kısıtlar, HANGİ SÜTUNUN yazıldığını değil. Yani kullanıcı kendi satırında
-- plan='pro' yazabiliyordu (yetki profiles'tan okunmaya başlandığı an bypass).
drop policy if exists "profil sahibi" on profiles;

create policy "profil oku" on profiles for select to authenticated
  using (id = auth.uid());
create policy "profil guncelle" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profil olustur" on profiles for insert to authenticated
  with check (id = auth.uid());

-- Sütun düzeyinde yetki: yalnızca kullanıcının kendi tercihleri yazılabilir.
revoke update on profiles from authenticated;
grant update (display_name, niche_slug, youtube_channel_id) on profiles to authenticated;

-- ── 2) 0001'deki döngü politikaları yeniden çalıştırılabilir olsun
-- (create policy öncesi drop yoktu; migration'ın tekrarı hata verip yarıda kalıyordu)
do $$
declare t text;
begin
  foreach t in array array['folders','saved_videos','channel_lists','tracked_channels','alerts','notifications','chats']
  loop
    execute format('drop policy if exists "%s sahibi" on %I', t, t);
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "%s sahibi" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- ── 3) match_videos: sabit search_path (hijyen)
alter function match_videos(vector, int, numeric, text, boolean)
  set search_path = public, pg_temp;
