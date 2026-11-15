-- Register RECON Wellness as one community, not a physical gym.
-- Keep paused until launch approval; do not change an existing program on reapply.
insert into public.partner_programs (slug, name, status, locations)
values ('recon', 'RECON Wellness', 'paused', array['RECON Wellness'])
on conflict (slug) do nothing;
