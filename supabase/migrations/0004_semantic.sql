-- Semantik arama: pgvector + embedding kolonu + eşleştirme RPC'si
-- (Gemini text-embedding-004 → 768 boyut; scripts/embed.ts doldurur)

create extension if not exists vector;

alter table videos add column if not exists embedding vector(768);

-- HNSW: küçük/orta indekste hızlı kosinüs araması
create index if not exists idx_videos_embedding on videos
  using hnsw (embedding vector_cosine_ops);

-- Sorgu embedding'ine en yakın videolar (temel filtrelerle)
create or replace function match_videos(
  query_embedding vector(768),
  match_count int default 100,
  min_multiplier numeric default 0,
  niche text default null,
  only_short boolean default null
)
returns table (id text, similarity float)
language sql stable
as $$
  select v.id, 1 - (v.embedding <=> query_embedding) as similarity
  from videos v
  join channels c on c.id = v.channel_id
  where v.embedding is not null
    and v.outlier_score >= min_multiplier
    and (niche is null or c.niche_slug = niche)
    and (only_short is null or v.is_short = only_short)
  order by v.embedding <=> query_embedding
  limit match_count;
$$;
