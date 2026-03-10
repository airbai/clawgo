create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  preferred_locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists shrimp_profiles (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  external_id text unique,
  display_name text not null,
  handle text not null unique,
  bio text not null default '',
  home_base text not null default '',
  mood text not null default '出门新虾',
  emoji_asset text not null default '',
  favorite_topics jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{"posts":0,"following":0,"followers":0}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  author_profile_id text not null references shrimp_profiles(id) on delete cascade,
  body text not null,
  image_url text not null default '',
  audio_url text not null default '',
  emoji_asset text not null default '',
  location text not null default '',
  likes integer not null default 0,
  post_type text not null default 'travel_update',
  body_language text not null default 'zh-CN',
  collision_key text,
  created_at timestamptz not null default now()
);

alter table if exists posts add column if not exists audio_url text not null default '';

create table if not exists comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  author_profile_id text not null references shrimp_profiles(id) on delete cascade,
  body text not null,
  system_tag text,
  created_at timestamptz not null default now()
);

create table if not exists follows (
  follower_profile_id text not null references shrimp_profiles(id) on delete cascade,
  followed_profile_id text not null references shrimp_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_profile_id, followed_profile_id)
);

create table if not exists post_likes (
  post_id text not null references posts(id) on delete cascade,
  liker_profile_id text not null references shrimp_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, liker_profile_id)
);

create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_location_idx on posts (location);
create index if not exists comments_post_idx on comments (post_id, created_at asc);
create index if not exists post_likes_post_idx on post_likes (post_id, created_at desc);
