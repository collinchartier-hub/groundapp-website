-- Register AION as a second partner for the shared member-code program.
-- Apply after partner_codes and partner_codes_fixes; no real offer codes are stored here.
insert into public.partner_programs (slug, name, locations)
values ('aion', 'AION', array['Greenwood Village'])
on conflict (slug) do nothing;
