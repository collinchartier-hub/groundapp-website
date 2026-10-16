# How changes go live (read this first)

This is the deploy rulebook for every tool that edits this repo: Claude Code, Manus, anything else. Same rules for all of them.

- Live site: https://groundapp.live
- Hosting: Cloudflare Pages project `groundapp`. GitHub Actions deploys every push (`.github/workflows/deploy.yml`). Nobody uploads anything by hand.
- This repo is PUBLIC. Never commit secrets, subscriber data, send logs or private notes, anywhere in it.

## The rules

1. **Start from the latest code.** `git pull` (or a fresh clone) before changing anything. Another tool may have shipped since you last looked.
2. **Work on a branch, never directly on `main`.** Keep the branch name short and simple (letters, numbers, `-`, `/`).
3. **Push the branch and open a pull request.** The push deploys a preview to `https://<branch>.groundapp.pages.dev` (slashes become dashes). The exact link is in the run summary: GitHub > Actions > Deploy > the run for your branch.
   - Previews sit behind Cloudflare Access, so only Collin can open them (he signs in). Agents can't load them; send him the link.
   - The signup form and `/admin` don't work on previews on purpose (no secrets there), so test signups never reach the real list.
4. **Send Collin the preview link and a plain list of what changed. Then wait.**
5. **Go live only when Collin says so.** Going live = merging the pull request into `main`. A push to `main` IS the live deploy, so nothing lands on `main` without his go.
6. **Never deploy by hand.** Don't run `wrangler pages deploy`, and `scripts/deploy.sh` is retired (it only prints a reminder now).
7. **Never force-push `main`.** To undo a live change, `git revert` it on a branch and go through the same steps. Emergency re-deploy of `main`: GitHub > Actions > Deploy > Run workflow. Collin can also roll back in the Cloudflare dashboard: Workers & Pages > groundapp > Deployments.
8. **After it's live, check it.** Confirm the Actions run is green, then load the changed page on https://groundapp.live.

## What the deploy checks (it fails instead of shipping)

- `scripts/check-site.sh`: nothing in `site/` that looks private (`.py`, `.log`, `.csv`, `.env`, `.json` outside `site/assets/lottie/`, CLAUDE/AGENTS files, `marketing/`, `substack/`, `private/` folders).
- Blog pages are up to date. Posts are written in `content/posts/*.md`. After editing one, run `python3 scripts/build_blog.py` (needs `pip3 install markdown==3.9`) and commit the files it changes in `site/blog/` and `site/_redirects`.

## Layout

- `site/` is exactly what goes live. Nothing else goes in it.
- `functions/` = Cloudflare Pages Functions (signup, unsubscribe, admin API, host redirects). `lib/` = shared code for them, including the welcome email.

## What a push does NOT deploy

These are done from Collin's laptop, through Claude Code only. If a change needs any of them, stop and ask Collin. Manus hands these off instead of doing them.

- `workers/asc-sync/` (App Store Connect sync Worker): `wrangler deploy` from its folder
- Pages secrets, Cloudflare Access apps, DNS, email routing
- Supabase tables and functions (SQL record in `db/`)

## Copy rules

- No em dashes. Casual and direct. Spell it GroundApp.
- Claims must match the shipped app (free download, 4 free techniques, Premium $29.99/yr). No free-trial claim.
