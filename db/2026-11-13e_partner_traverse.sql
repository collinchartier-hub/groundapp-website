-- Record the Traverse Fitness partner program, already applied by the orchestrator.
-- Created paused so member claims wait until launch; resume the program at launch.
insert into public.partner_programs (slug, name, status, locations)
values ('traverse', 'Traverse Fitness', 'paused', array['South Broadway', 'Highlands'])
on conflict (slug) do nothing;
