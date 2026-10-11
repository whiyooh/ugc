create table public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default jsonb_build_object(
    'products', '[]'::jsonb,
    'creators', '[]'::jsonb,
    'copies', '[]'::jsonb,
    'videos', '[]'::jsonb,
    'references', '[]'::jsonb,
    'feedbacks', '[]'::jsonb,
    'drafts', '[]'::jsonb,
    'completedSteps', '[]'::jsonb
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_workspaces_data_is_object check (jsonb_typeof(data) = 'object')
);

alter table public.user_workspaces enable row level security;

grant select, insert, update, delete on public.user_workspaces to authenticated;

create policy "Users can read their own workspace"
  on public.user_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own workspace"
  on public.user_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workspace"
  on public.user_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own workspace"
  on public.user_workspaces for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_workspace_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_user_workspaces_updated_at
  before update on public.user_workspaces
  for each row execute function public.set_workspace_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'workspace-images',
  'workspace-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read their own workspace images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload their own workspace images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own workspace images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own workspace images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'workspace-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
