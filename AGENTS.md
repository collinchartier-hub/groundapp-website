# How changes go live (read this first)

This is the rulebook for every tool that edits this repo: Claude Code, Manus, anything else. Same rules for all of them.

- Live site: https://groundapp.live
- Hosting: Cloudflare Pages project `groundapp`. Normally GitHub Actions deploys every push (`.github/workflows/deploy.yml`).
- This repo is PUBLIC. Never commit secrets, subscriber data, send logs or private notes, anywhere in it.

## The rules

1. **Start from the latest code.** `git pull` (or a fresh clone) before changing anything. Another tool may have shipped since you last looked.
2. **Work on a branch, never directly on `main`.** Keep the branch name short and simple (letters, numbers, `-`, `/`).
3. **Push the branch and open a pull request.** The push deploys a preview to `https://<branch>.groundapp.pages.dev` (lowercase, anything that isn't a letter or number becomes `-`). Once the Deploy run finishes (about a minute), the pull request shows a **View deployment** button with the exact link.
   - Previews sit behind Cloudflare Access, so only Collin can open them (he signs in). Agents can't load them; send him the link.
   - The signup form and `/admin` don't work on previews on purpose (no secrets there), so test signups never reach the real list.
4. **Send Collin the preview link and a plain list of what changed. Then wait.** To get the exact link: `gh api "repos/collinchartier-hub/groundapp-website/deployments?sha=$(git rev-parse HEAD)" --jq '.[0].statuses_url'`, then `gh api <that url> --jq '.[0].environment_url'`. Empty means the run hasn't finished or failed: check `gh api "repos/collinchartier-hub/groundapp-website/actions/runs?head_sha=$(git rev-parse HEAD)" --jq '.workflow_runs[0] | .status, .conclusion, .html_url'`.
5. **Go live only when Collin says so.** Going live = merging the pull request into `main`. A push to `main` IS the live deploy, so nothing lands on `main` without his go. GitHub enforces this: `main` only accepts pull requests whose Deploy check passed.
6. **No hand deploys while GitHub works.** Don't run `wrangler pages deploy` when GitHub is up; `scripts/deploy.sh` is retired (it only prints a reminder). The one exception is below.
7. **Never force-push `main`.** To undo a live change, `git revert` it on a branch and go through the same steps. Emergency re-deploy of `main`: GitHub > Actions > Deploy > Run workflow. Collin can also roll back in the Cloudflare dashboard: Workers & Pages > groundapp > Deployments.
8. **After it's live, check it.** Confirm the Actions run on `main` is green, then load the changed page on https://groundapp.live (from a cloud session, ask Collin to look).

## While GitHub is unavailable (Collin's call, 2026-10-30)

Collin's GitHub account was suspended on 2026-10-30. Until it's back, Claude Code on Collin's laptop ships by direct upload. Nobody else does.

- Preview: `npx wrangler pages deploy site --project-name groundapp --branch <branch>`. It lands at `https://<branch>.groundapp.pages.dev` behind Cloudflare Access, the same as a normal preview.
- Live: only after Collin says go, from the exact commit he approved: `npx wrangler pages deploy site --project-name groundapp --branch main --commit-hash "$(git rev-parse HEAD)" --commit-message "$(git log -1 --pretty=%s)"`. Run `./scripts/check-site.sh` and `python3 scripts/build_blog.py` (no changes) first.
- Keep every change committed on its branch. When GitHub is back, push the branches, merge what went live into `main` through pull requests, and go back to the normal rules.
- Cloud sessions from the Claude app can't work while GitHub is down: they clone from GitHub.

## Working from the Claude app (cloud sessions)

Collin can run all of this from his phone: Claude app > Code > pick `groundapp-website` > describe the change.

- The session starts on a fresh cloud machine. `scripts/cloud-setup.sh` (SessionStart hook in `.claude/settings.json`) installs what the blog build needs.
- `gh pr ...` and `gh issue ...` don't work there (GitHub's GraphQL API is blocked). Open, read and merge pull requests with the built-in GitHub tools or `gh api` REST calls, e.g. merge with `gh api -X PUT repos/collinchartier-hub/groundapp-website/pulls/<number>/merge -f merge_method=merge`.
- The cloud machine can't load `*.pages.dev` or `groundapp.live` pages. Collin checks the preview on his phone; you report the link.

## What the deploy checks (it fails instead of shipping)

- `scripts/check-site.sh`: nothing in `site/` that looks private (`.py`, `.log`, `.csv`, `.env`, `.json` outside `site/assets/lottie/`, CLAUDE/AGENTS files, `marketing/`, `substack/`, `private/` folders).
- Blog pages are up to date. Posts are written in `content/posts/*.md`. After editing one, run `python3 scripts/build_blog.py` (needs `pip3 install markdown==3.9`) and commit the files it changes in `site/blog/` and `site/_redirects`.

## Layout

- `site/` is exactly what goes live. Nothing else goes in it.
- `functions/` = Cloudflare Pages Functions (signup, unsubscribe, admin API, host redirects). `lib/` = shared code for them, including the welcome email (`lib/welcome.js`).
- `game/` = source for Bodie's Breath Run (`/play`). Edit `game/src/`, then `python3 game/build.py`; never edit the built files in `site/`.

## What a push does NOT deploy

These are done from Collin's laptop, through Claude Code only. If a change needs any of them, stop and ask Collin. Manus hands these off instead of doing them.

- `workers/asc-sync/` (App Store Connect sync Worker): `wrangler deploy` from its folder
- Pages secrets, Cloudflare Access apps, DNS, email routing
- Supabase tables and functions (SQL record in `db/`)

## Copy rules

- No em dashes. Casual and direct. Spell it GroundApp. The companion is Bodie.
- Claims must match the shipped app (App Store version 1.2.1, 2026-10-29). Source of truth: the live App Store listing (`https://itunes.apple.com/lookup?id=6760352779`); a copy is in `docs/site-v3/app-store-listing-2026-10-29.txt`.
  - Free to download.
  - More than 40 techniques. 4 are free forever: Box Breathing, Deep Slow Breathing, 2-to-1 Breathing, Triangle Breathing.
  - Free also includes the session timer, streaks, basic stats, check-ins with Bodie and live heart rate.
  - GroundApp Premium: $39.99 a year in the US. Adds all techniques, the Advanced O2 and CO2 tables and guided sessions in Collin's voice. Aura was removed from the app: never mention it.
  - Eligible new subscribers get a 3-day free trial. Say "eligible new subscribers"; never promise a trial to everyone.
  - iPhone and Apple Watch. Wearables (Whoop, Garmin, Oura, COROS) reach GroundApp through Apple Health; live heart rate comes from a Bluetooth monitor or a Whoop or Garmin broadcasting heart rate.
- Advanced tables always carry: "Dry land only. Never in or near water."
- Heart rate and wearable copy: readings inform suggestions; they are not a medical assessment. No health outcome claims.
- Reviews: only real reviews, quoted exactly, with their source.
