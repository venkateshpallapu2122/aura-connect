
-- Remove foreign key constraint from profiles to allow demo users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert demo users
INSERT INTO public.profiles (id, username, avatar_url, status, is_online)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice_wonder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'Available for chat!', true),
  ('22222222-2222-2222-2222-222222222222', 'bob_builder', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'Working on something cool', false),
  ('33333333-3333-3333-3333-333333333333', 'charlie_dev', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', 'Coding away...', true),
  ('44444444-4444-4444-4444-444444444444', 'diana_design', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana', 'Creating magic ✨', false),
  ('55555555-5555-5555-5555-555555555555', 'eve_engineer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', 'Hey there!', true)
ON CONFLICT (id) DO NOTHING;
