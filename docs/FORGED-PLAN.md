# FORGED implementation and preservation map

Approved direction: Hassan's 24 Nov design review. Work is isolated on design/forged-redesign. No merge or deployment is part of this change.

## Route map

- `/`: Train. Next routine, recent activity, real seven-day count, resume session.
- `/plan`: Plan. Existing routine library, create/import/edit/delete, optional local weekly schedule.
- `/day/:day`: Dedicated logging mode. One exercise at a time, original routine IDs and input drafts, compact rest controls, review before save.
- `/progress`: Overview / Strength / Body / More, with clear History access. Existing analytics retained.
- `/history`: Retained URL and all edit/delete controls, accessible inside Progress.
- `/nutrition`: Fuel. Existing target calculator AND existing food diary retained. The earlier public-page inspection only reached the wizard; code inspection found the diary. No removal of stored meals.
- `/coach` and `/coach/:chatId`: Retained. Entry points from Plan, Progress and settings instead of a main tab. No chat history removed.
- Custom editors, share receiver, settings and informational pages retained.

## State map

Train: loading/error/no routines/first session/returning/active session. No sample statistics in production.
Plan: loading/error/empty/library/import/create/edit/delete confirmation. Schedule is additive, local, optional; unassigned slots remain unassigned.
Logger: loading/missing routine/empty routine/draft/active/resting/review/saving/offline queued/error/saved. Exit keeps drafts. Invalid input cannot save. Existing save/offline functions retained, no background test writes to production.
Progress: existing sign-in boundary and existing empty states retained. History retains independent deep links.
Fuel: wizard until targets exist; diary thereafter. Existing meal entries, targets and recent foods unchanged.
Settings: existing export/import/account controls retained; Coach link added.

## Data preservation: no schema migration

- Supabase tables, row IDs, owner IDs, exercise names and relationships: unchanged. No SQL migration, deletes, bulk updates or new automatic import.
- localStorage: `ironlog_custom_days`, `ironlog_workout_sessions`, `ironlog_set_logs`, `ironlog_exercise_notes`, macro targets, food diary, recent foods, profile, theme, Coach threads, query cache: unchanged.
- Existing per-user/per-routine `ironlog:draft:*` and `ironlog:order:*` keys remain. Hydration now retains set kinds/completion flags instead of stripping them.
- IndexedDB `ironlog-outbox` version 1 / `workouts`: unchanged.
- Additive keys only: optional weekly schedule and active routine pointer. They do not rewrite old data.
- Existing global session-start timestamp remains compatible. A legacy running timer without a routine pointer is not guessed or discarded.
- No authenticated production mutations during testing. Guest fixture data is used only in isolated local-browser storage and explicitly labeled in screenshots.

## Risks found before coding

The existing npm lock is out of sync with package.json; a normal install is required before builds. Existing persistence catches some remote errors, so a successful local save is not proof of cloud sync. Existing auth-triggered local backup and shared local caches need separate account-isolation review. No broad persistence rewrite is hidden in this visual branch. Existing warm-up sets are not saved by the current model; this is disclosed, not silently changed. Metric history has existing limits (100 sessions, exercise queries capped), so it is not represented as all-time proof.

## Acceptance

Build and typecheck, targeted draft/schedule tests, mobile widths 320/390, desktop 1280, keyboard focus, guest routine navigation, reload draft, set completion/undo, review/cancel, empty wizard. Protected views require an authenticated follow-up and no claim of private-data verification. Keep main at the original SHA until explicit merge approval.

## Implemented and verified on 24 Nov

- FORGED tokens cover dark and light modes; existing theme preference key preserved.
- Four-tab navigation; Plan owns all existing import/create/edit/delete controls and an optional, user-scoped local weekly schedule. Train prefers a scheduled routine for the current weekday, otherwise transparently labels the next routine in the existing rotation.
- Focus logger removes global chrome; shows one exercise with previous/next/direct selection. Notes, chart and plate calculator are disclosed under details. Compact rest timer uses a wall-clock deadline during its mounted lifetime, so background timer throttling does not accumulate drift.
- Draft hydration retains kind/done flags and unknown exercise entries. Active-routine pointer is only set on explicit Start, not on visiting another routine. Existing timestamp retained. Browser close warning protects filled drafts. Numeric inputs have exercise/set-specific labels.
- Session review validates before save; errors keep drafts. Successful save clears working draft and active pointer. Save still uses the existing persistence layer, including its existing limitations. Nothing is shared automatically by this branch.
- Existing Progress analytics are restyled through tokens and given History/Coach entry points, not replaced with mocked chart data. Signed-in analytics are not verified.
- Existing Fuel calculator/meal diary preserved and rebranded. Local target hydration now runs after mount to avoid server/client mismatch on saved-target reload.
- Initial measured mobile overflow in the existing long settings reset button was fixed. All eight checked routes fit at 320, 390 and 1280 pixels. Mobile screenshots are viewport captures, not full-page images with a fixed nav across their middle.

Checks: production build passes; TypeScript noEmit passes; 8 unit tests pass; lint passes on the newly written/replaced modules (not a claim that legacy whole-repo lint is clean). Two local browser suites pass with no page errors: draft reload/completion, schedule reload, exercise switching, review/cancel, guest save, invalid-value rejection, active pointer preservation, successful-save draft clear, 24 route-width checks, Fuel fixture diary rendering. All writes were isolated guest localhost data. No authenticated production writes or uploads, no AI API calls. Browser tools used only local code for these tests.

Browser scripts need Playwright installed locally (`npm install --no-save --package-lock=false playwright`) and a system Chrome at `/usr/bin/google-chrome-stable`. Start the dev app on port 8081; then run `node scripts/check-forged.mjs` and `node scripts/capture-final.mjs`. These scripts create isolated browser contexts. The save checks write guest records only to their localhost context.

## Remaining before merge

1. Publish the branch through an authenticated repository-write route. No credential was present; push dry-run failed before any remote change.
2. Obtain signed-in preview QA for Progress/Body, cloud history, protected Coach and account paths. Check Supabase RLS against the user's test account, without deleting or altering existing production data.
3. Test iOS WebView keyboard/safe-area behavior and an offline reload/reconnect on a real device. No claim of full PWA/offline durability from a desktop test.
4. Review existing persistence safety: remote errors are sometimes swallowed and some caches are not account-scoped. That pre-existing concern was not silently rewritten here. Existing reset/delete controls remain intentionally destructive only when explicitly used.
5. Dependency audit: normal install repaired the pre-existing out-of-sync npm lock. `npm audit --omit=dev` reports 11 dependency findings (5 moderate, 6 high) with this resolved tree. No forced or breaking security upgrades applied as part of the design.
6. This is a working first implementation, not exact feature parity with every concept screen. Program-level entities, routine rep-range prescriptions, share privacy controls, planned workout durations and expanded Body analytics are not invented in the UI. History and analytics retain existing behavior. Optional schedule is device-local, not cloud synced. Routine rename/add/remove during logging retains existing template-edit behavior.
7. Main remains unchanged. No branch push, PR, merge, deployment, database migration, account change or production data rewrite occurred. Explicit review and merge approval still required.

## Apply approval, 24 Nov
Hassan approved applying this version to the repository and live app after reviewing the screens. Publication is now authorized. Revalidated remote main at baseline 2e0f7808add51843ca0802805cd0f580f96fe84f before push. This approval supersedes the earlier preview-only hold; the QA limitations above still apply. No database migration is introduced.
