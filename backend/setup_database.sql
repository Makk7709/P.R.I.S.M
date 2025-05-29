-- Supprimer la table si elle existe déjà
drop table if exists public.prism_memories;

-- Créer la table prism_memories
create table public.prism_memories (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  content text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Activer RLS
alter table public.prism_memories enable row level security;

-- Créer la politique d'insertion
create policy "Allow insert for all" 
on public.prism_memories
for insert
using (true);

-- Créer la politique de lecture
create policy "Allow select for all"
on public.prism_memories
for select
using (true);

-- Créer l'index pour les requêtes par date
create index prism_memories_created_at_idx on public.prism_memories(created_at desc); 