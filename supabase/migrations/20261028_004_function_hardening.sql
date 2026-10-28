-- ============================================================
-- Sprint 4: function hardening (from Supabase security advisors)
--
-- 1. Pin search_path on every function so a SECURITY DEFINER body can't be
--    tricked into resolving a table or operator from another schema.
-- 2. Stop anonymous (signed-out) visitors from calling RPCs at all. Only
--    signed-in users may call the app's functions; trigger functions are
--    callable only by the roles that fire them.
-- ============================================================

-- 1. search_path --------------------------------------------
alter function get_my_halaqa_ids() set search_path = public, pg_temp;
alter function get_my_student_ids() set search_path = public, pg_temp;
alter function get_my_child_ids() set search_path = public, pg_temp;
alter function get_my_enrolled_halaqa_ids() set search_path = public, pg_temp;
alter function get_my_assignment_ids() set search_path = public, pg_temp;
alter function get_my_halaqa_assignment_ids() set search_path = public, pg_temp;
alter function get_child_assignment_ids() set search_path = public, pg_temp;
alter function get_my_assignment_item_ids() set search_path = public, pg_temp;
alter function get_my_halaqa_assignment_item_ids() set search_path = public, pg_temp;
alter function get_child_assignment_item_ids() set search_path = public, pg_temp;
alter function owns_assignment_item(uuid) set search_path = public, pg_temp;
alter function increment_listen(uuid) set search_path = public, pg_temp;
alter function submit_item(uuid) set search_path = public, pg_temp;
alter function claim_student_slot(text) set search_path = public, pg_temp;
alter function create_student_slot(uuid, text, text, text) set search_path = public, pg_temp;
alter function instructor_roster() set search_path = public, pg_temp;
alter function seed_lesson_types() set search_path = public, pg_temp;
alter function handle_new_user() set search_path = public, pg_temp;

-- 2. execute privileges -------------------------------------
-- App RPCs and RLS helpers: signed-in users only.
do $$
declare f text;
begin
  foreach f in array array[
    'get_my_halaqa_ids()', 'get_my_student_ids()', 'get_my_child_ids()',
    'get_my_enrolled_halaqa_ids()', 'get_my_assignment_ids()',
    'get_my_halaqa_assignment_ids()', 'get_child_assignment_ids()',
    'get_my_assignment_item_ids()', 'get_my_halaqa_assignment_item_ids()',
    'get_child_assignment_item_ids()', 'owns_assignment_item(uuid)',
    'increment_listen(uuid)', 'submit_item(uuid)', 'claim_student_slot(text)',
    'create_student_slot(uuid, text, text, text)', 'instructor_roster()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Trigger functions: nobody calls these over the API.
-- seed_lesson_types fires on halaqat insert (by an authenticated user);
-- handle_new_user fires on auth.users insert (by supabase_auth_admin).
revoke all on function seed_lesson_types() from public, anon;
grant execute on function seed_lesson_types() to authenticated;
revoke all on function handle_new_user() from public, anon, authenticated;
grant execute on function handle_new_user() to supabase_auth_admin;
