-- ============================================================
-- Sprint 1: lean-up + lesson model
--
-- 1. Drop the invite-code linking path (superseded by student_slots).
-- 2. Reseed lesson types: New Lesson, Review (active), Subac (inactive).
--    Replace "Group Review" where it was never used.
-- 3. Add end_surah so a range can cross surahs (needed for Subac / juz).
-- ============================================================

-- 1. Invite codes -------------------------------------------
drop function if exists redeem_invite_code(text);
drop function if exists generate_invite_code(uuid, int);
drop table if exists invite_codes;

-- 2. Lesson types -------------------------------------------
create or replace function seed_lesson_types()
returns trigger as $$
begin
  if not exists (select 1 from lesson_types where instructor_id = new.instructor_id) then
    insert into lesson_types (instructor_id, name, description, sort_order, is_active) values
      (new.instructor_id, 'New Lesson', 'New verses to memorize', 1, true),
      (new.instructor_id, 'Review', 'Recent revision, one or more ranges', 2, true),
      (new.instructor_id, 'Subac', 'Long revision by juz or range', 3, false);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Existing instructors: add Subac (inactive) if they don't have one.
insert into lesson_types (instructor_id, name, description, sort_order, is_active)
select lt.instructor_id, 'Subac', 'Long revision by juz or range',
       coalesce(max(lt.sort_order), 0) + 1, false
from lesson_types lt
group by lt.instructor_id
having not exists (
  select 1 from lesson_types x
  where x.instructor_id = lt.instructor_id and x.name = 'Subac'
);

-- Retire "Group Review" where it was never assigned.
update lesson_types lt
set is_active = false, updated_at = now()
where lt.name = 'Group Review'
  and lt.is_active
  and not exists (select 1 from assignment_items ai where ai.lesson_type_id = lt.id);

-- 3. Cross-surah ranges -------------------------------------
alter table assignment_items
  add column end_surah int;
update assignment_items set end_surah = surah where end_surah is null;
alter table assignment_items
  alter column end_surah set not null,
  add constraint assignment_items_end_surah_check check (end_surah between surah and 114),
  drop constraint if exists assignment_items_check,
  add constraint assignment_items_end_ayah_check
    check (end_surah > surah or end_ayah >= start_ayah);

alter table practice_presets
  add column end_surah int;
update practice_presets set end_surah = surah where end_surah is null;
alter table practice_presets
  alter column end_surah set not null,
  add constraint practice_presets_end_surah_check check (end_surah between surah and 114),
  drop constraint if exists practice_presets_check,
  add constraint practice_presets_end_ayah_check
    check (end_surah > surah or end_ayah >= start_ayah);
