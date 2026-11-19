# Partner follow-ups

An hourly Cloudflare Worker calls the Pages Function `POST /api/partner/followups`. The Pages Function claims at most 15 eligible claims atomically and sends one welcome or reminder email per claim. The Worker does not handle member data or hold the Supabase or Resend keys.

## Cutover order (run on Collin's Mac)

1. Apply `db/2026-11-19_partner_followups.sql` **after** the already-live `2026-11-17_partner_buckets.sql`. The migration marks only already-emailed assigned claims `legacy`; waitlisted and never-emailed claims remain eligible once they receive a code email. It does not send emails.
2. Deploy the Pages site with the new endpoint and code-free claim email. Set `PARTNER_CRON_SECRET` as a **Pages secret**, together with the existing Supabase, Resend, unsubscribe, and mailing-address secrets. Use the same random secret in the Worker.
3. Run `node scripts/partner-followups-cutover.mjs --dry-run`, then `node scripts/partner-followups-cutover.mjs` on Collin's Mac with `.dev.vars`. It inspects every old `nudge_email_id` with Resend, cancels only reminders still scheduled in the future, clears their IDs, and releases those claims for the new job. Already-sent reminders remain handled. Failed cancellations stay excluded from the job and require investigation. Do not enable the Worker until this step succeeds. If a cancellation succeeds but the database update fails, inspect that claim manually before proceeding.
4. From this directory: `npx wrangler secret put PARTNER_CRON_SECRET` (paste the same Pages secret), then `npx wrangler deploy`. The cron is `0 * * * *` (hourly UTC); `workers_dev = false`, so no public Worker URL is exposed. Keep the Worker disabled until migration, Pages deploy, and cutover are done.
5. Check the Partners panel for `Code opened`, `Welcome sent`, `Reminder sent`, and individual errors. The Worker reports runs with failed deliveries or bookkeeping as failures in Cloudflare observability. A failed send remains claimed and will not be retried automatically; an admin can resend the code email manually. If the row says `not confirmed`, inspect Pages logs because the send result could not be written to the database.

Do not add credentials to `wrangler.toml`, source, the public repo, or logs. If `.dev.vars` lacks `PARTNER_CRON_SECRET`, generate a new random value locally and configure the same value in both Cloudflare projects.
