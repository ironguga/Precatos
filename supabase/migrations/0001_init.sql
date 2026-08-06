-- Módulo 1 — captação de precatórios (DJEN + DEPRE)
-- Aplicar no SQL Editor do Supabase ou via `supabase db push`.

-- Alvos de originação: um por processo, consolidado das duas fontes.
create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  numero_processo text unique not null,          -- 20 dígitos CNJ, sem máscara
  numero_processo_mascara text,
  tribunal text not null default 'TJSP',
  fonte text not null check (fonte in ('djen', 'depre')),
  ente_devedor text,
  natureza text,
  valor numeric,
  credor text,
  advogado_nome text,
  advogado_oab text,
  posicao_fila integer,
  ano_orcamento integer,
  -- pipeline de abordagem (módulo 4 consumirá isto)
  status text not null default 'novo'
    check (status in ('novo', 'contatado', 'proposta', 'diligence', 'escritura', 'descartado')),
  score numeric,                                 -- módulo 3 preencherá
  primeira_deteccao timestamptz not null default now(),
  ultima_atualizacao timestamptz not null default now(),
  raw jsonb
);

create index if not exists targets_status_idx on targets (status);
create index if not exists targets_fonte_idx on targets (fonte);
create index if not exists targets_valor_idx on targets (valor desc nulls last);

-- Comunicações brutas capturadas do DJEN (API Comunica/CNJ).
create table if not exists djen_comunicacoes (
  id bigint generated always as identity primary key,
  djen_id text unique not null,
  hash text,
  numero_processo text,
  data_disponibilizacao date,
  sigla_tribunal text,
  tipo_comunicacao text,
  orgao text,
  termo_busca text not null,
  texto text,
  link text,
  destinatarios jsonb,
  advogados jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists djen_processo_idx on djen_comunicacoes (numero_processo);
create index if not exists djen_data_idx on djen_comunicacoes (data_disponibilizacao desc);

-- Entradas da ordem cronológica da DEPRE, uma foto por mês.
create table if not exists depre_entries (
  id bigint generated always as identity primary key,
  snapshot_mes date not null,                    -- primeiro dia do mês da coleta
  ente_devedor text not null default '',
  ordem integer,
  numero_processo text,
  natureza text,
  valor numeric,
  ano_orcamento integer,
  arquivo_origem text,
  raw jsonb,
  criado_em timestamptz not null default now(),
  unique (snapshot_mes, ente_devedor, numero_processo)
);

create index if not exists depre_processo_idx on depre_entries (numero_processo);
create index if not exists depre_snapshot_idx on depre_entries (snapshot_mes desc);

-- Log de execuções do Worker (cron e manuais).
create table if not exists runs (
  id bigint generated always as identity primary key,
  fonte text not null,
  iniciado_em timestamptz not null,
  finalizado_em timestamptz,
  ok boolean not null default false,
  itens_novos integer not null default 0,
  detalhes jsonb
);

create index if not exists runs_iniciado_idx on runs (iniciado_em desc);

-- Mantém ultima_atualizacao em dia nos alvos.
create or replace function touch_ultima_atualizacao()
returns trigger language plpgsql as $$
begin
  new.ultima_atualizacao := now();
  return new;
end $$;

drop trigger if exists targets_touch on targets;
create trigger targets_touch
  before update on targets
  for each row execute function touch_ultima_atualizacao();

-- O Worker usa a service_role key (bypassa RLS), mas ativamos RLS para
-- impedir acesso anônimo caso a anon key vaze para algum front no futuro.
alter table targets enable row level security;
alter table djen_comunicacoes enable row level security;
alter table depre_entries enable row level security;
alter table runs enable row level security;

-- Concede acesso à service_role (o coletor). No Supabase hospedado isso já
-- vem por default privileges; explicitar aqui garante o mesmo comportamento
-- no Supabase local e em qualquer reaplicação limpa do schema.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
