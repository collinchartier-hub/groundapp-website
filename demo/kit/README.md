# Stageshow kit (subset)

Copied unchanged from [benjitaylor/skills](https://github.com/benjitaylor/skills), `stageshow/kit/`, version 1.1.1
(commit `299140f`, 2026-11-04). MIT, see `LICENSE`.

Only the files the demos import are here: the stage, the phone and one motion part (`Roll`).
The kit's bundled brand marks and app icons are left out on purpose: its `NOTICE.md` says they are not under the MIT
license, and this repo is public.

Need another part? Copy it from `~/.agents/skills/stageshow/kit/` with whatever it imports. Do not edit these files:
restyle from the demo's own CSS (the kit's rules are in `@layer stageshow`, so unlayered CSS wins).
