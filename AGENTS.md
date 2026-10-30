# Project rules

- Page-wrapper entrance animations (e.g. `animate-fade-in` on `app-scroll-root`) must animate opacity only, never transform: a composited/filled transform on a wrapper traps `position: fixed` children (workout control bar pinned wrong on mobile WebView).
- Fixed bottom action bars render outside the animated page wrapper and are positioned `bottom: calc(90px + env(safe-area-inset-bottom))` to clear the floating bottom nav.
- All AI provider calls go through server routes under `src/routes/api/*` that verify the Supabase bearer token and rate-limit via `ai_usage_events` (coach = `kind: "coach"`, nutrition = `kind: "nutrition"`). The browser never calls an AI provider directly or holds a provider key.
- Dialogs without a `DialogDescription` get `aria-describedby={undefined}` on `DialogContent` to silence the Radix a11y warning; dialogs that do have a description keep the implicit link instead.
- Design tokens for macro/success colors live in `src/styles.css` (`--protein`, `--carbs`, `--fat`, `--success`); never hardcode hex colors in components.
