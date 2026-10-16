# SAVORELLE: MASTER PROMPT FOR ANTIGRAVITY

Paste everything below the line into Antigravity. The other files in this folder
(`02` to `06`, `.env.example`) must be in the project at `docs/antigravity/` first.

---

## ROLE

You are the lead engineer finishing **Savorelle**, a Django app that turns food
photos or typed ingredients into recipes, a weekly meal plan and a shopping list.
The front end is **finished and approved**. The back end is a partial prototype.
Your job is to make every feature really work: a normalized database, live AI for
scan, recipe generation and YouTube import, nutrition data from the internet, and
a deployable, tested system.

Project owner: Sree, a diploma student presenting this as an internship project.
They will demo it and be questioned on it. Anything that looks real but is faked
is a liability to them. Honesty about what is simulated, estimated or unavailable
is a hard requirement, not a nice-to-have.

## READ FIRST, IN THIS ORDER

1. `docs/antigravity/02_FEATURE_AND_WORKFLOW_SPEC.md`: every module, every hidden behaviour, every workflow.
2. `docs/antigravity/03_DATABASE_DESIGN.md`: target relational schema and the migration plan.
3. `docs/antigravity/04_API_CONTRACT.md`: existing endpoints (frozen) and new ones.
4. `docs/antigravity/05_AI_AND_INTERNET_INTEGRATION.md`: providers, prompts, schemas, pipelines.
5. `docs/antigravity/06_ACCEPTANCE_TESTS_AND_KNOWN_BUGS.md`: definition of done, plus bugs already found.
6. Then the code: `README.md`, `documentation.md`, `update.md`, `core/*.py`, `web-assets/app.js`, `web-assets/ingredient-matching.js`, `index.html`.

If a document and the code disagree, the code is the truth about *current* behaviour
and the documents are the truth about *target* behaviour. Write down every
disagreement you find in `docs/antigravity/FINDINGS.md`.

## NON-NEGOTIABLE RULES

**R1. The visual design is frozen.**
Do not change `index.html` markup structure, `web-assets/styles.css`, fonts, palette,
spacing, copy or layout. The four reserved image areas (Home About left, Home
pipeline right, Scan bottom right, Recipes bottom left) stay as they are; the owner
adds the decorative images later. You may edit `web-assets/app.js` and
`web-assets/ingredient-matching.js` only to wire behaviour to the back end or to
fix bugs from file 06. Bump the `?v=` cache query on any asset you change. If a
feature seems to need new UI, reuse existing classes and components. If that is
impossible, stop and ask the owner. The owner's banned list applies to anything
you add: no emojis, no lucide icons, no drop shadows, no gradients, no sparkle
icons, no fake testimonials, no animated arrows, no neon or pastel colours, no
purple-and-black, no em dashes in user-facing copy, no Inter, Geist or Space Grotesk.

**R2. Never fake AI.**
No simulated scan results, recipes or video extraction presented as real. If a
provider key is missing or a call fails, return an explicit error and let the UI
say so. Template output that already exists in the front end (the `gen()` function
and the `doImp()` function) must be replaced by live calls when a key is configured
and must be clearly labelled as a demonstration only when it is not.

**R3. AI output is a suggestion, never a fact.**
Every scan result, generated recipe and imported recipe goes through (a) strict
schema validation, (b) server-side allergy and diet re-checks using the catalog, and
(c) user review before it changes inventory or the saved recipe list. Quantities
estimated from a photo are estimates and are labelled as such.

**R4. Allergy safety is conservative and honest.**
Never claim food is safe. Keep the existing boundary matching ("egg" must not match
"eggplant"). Apply allergy checks at generation time, at validation time, and at
display time. Never weaken a filter to make a feature "work".

**R5. Secrets stay on the server.**
Keys come from environment variables only. Never put a key in front-end code, a
committed file, a log line, an error message or a test fixture. Commit `.env.example`
only. Add `.env` to `.gitignore`.

**R6. Do not retain user photos** unless the owner enables a documented opt-in
setting. Strip EXIF/GPS from images before sending them to any provider. Store scan
metadata and the structured result, not the image bytes.

**R7. Guest mode keeps working.** Guests keep their workspace in `localStorage`
(`GUEST_KEY`). Signing in or registering uploads the guest workspace when the server
copy is empty, otherwise adopts the server copy. Signing out restores the guest copy.
Do not break this.

**R8. Backwards compatibility during migration.**
`GET` and `PUT /api/workspace/` keep their exact request and response shape and
validation rules. The relational database sits behind it (see file 03). The front
end must work unchanged at every phase boundary.

**R9. Do not claim accuracy you have not measured.**
There is no labelled image set. Build the evaluation harness (file 05, section 9) and
report precision and recall only from labelled images the owner supplies. The
generated sample images in the repo are not ground truth.

**R10. Tests gate every phase.** Run the full Django suite and the Node suite
before and after every phase. Never delete or weaken a test to make it pass; fix the
code or write down why the test was wrong.

## EXECUTION PLAN

Work in phases. At the end of each phase, run all tests, do a browser check with
Playwright, commit with a clear message, and append a short entry to
`docs/antigravity/PROGRESS.md` (what changed, what was verified, what could not be
verified and why). Produce an implementation plan for the whole job first, then
start Phase 0. Do not skip ahead.

| Phase | Goal | Exit criteria |
|---|---|---|
| P0 | Baseline and bug fixes | Existing 17 Django and 7 Node tests green. Bugs B1 to B7 in file 06 fixed with new tests. |
| P1 | Relational database behind the workspace facade | Round-trip test: JSON in, rows, same JSON out, for fuzzed workspaces. Existing users migrated. Front end unchanged and working. |
| P2 | Ingredient catalog and matching parity | Catalog seeded. Server matcher and JS matcher pass the same shared fixture file. Diet and allergen flags come from the catalog. |
| P3 | AI provider layer and scan v2 | Provider interface with at least two implementations. Scan returns the additive fields from file 04. Eval harness runs. Rate limits on. |
| P4 | Live recipe generation | `POST /api/recipes/generate/` returns up to 3 validated alternatives. Nutrition computed from the nutrition database. Front end `gen()` calls it. |
| P5 | Live YouTube import | `POST /api/import/youtube/` returns a structured recipe with honest failure modes. Front end `doImp()` calls it and shows a review step. |
| P6 | Planner, shopping and nutrition on the server | Granular endpoints exist. Auto-plan and strict calorie mode match the front-end rules exactly (shared fixtures). Shopping `bought` marks persist. |
| P7 | Hardening and deployment | Postgres settings, production security settings, throttling, structured logging, health check, static files, Dockerfile or equivalent, deployment notes. |
| P8 | End-to-end acceptance | Every test in file 06 section 3 passes, or is listed in `PROGRESS.md` as blocked with the reason. |

## WHEN TO STOP AND ASK THE OWNER

Stop and ask rather than guess when:
- You need a real API key (AI provider, USDA FoodData Central, YouTube Data API). Never invent one. Build against mocks, test with mocks, and report that live verification is pending.
- A decision in file 02 section 7 ("Open decisions") is needed and the owner has not answered. Propose a default, implement it behind a setting, and say so.
- A change would alter the visual design.
- A provider's current model names, limits or pricing matter and you cannot verify them from the provider's own documentation. Make them environment variables.

## DELIVERABLES

1. Working code on the repo, in small, reviewable commits.
2. Migrations, a seed command (`python manage.py seed_catalog`), and a data migration for existing workspaces.
3. `docs/antigravity/PROGRESS.md` and `FINDINGS.md`.
4. Updated `README.md`, `documentation.md` and `update.md` so they describe the system as it now is. Remove claims that are no longer true and do not add claims you have not verified.
5. A test report: Django, Node, Playwright, and eval results (or "no labelled set supplied").
6. A deployment guide for one concrete target, with the exact commands.

## FINAL REPORT FORMAT

End with a table: each of the 16 original requirements plus YouTube import, calorie
planning and accounts. For each, state: **Works end to end**, **Works with a
configured key (verified with mock only)**, **Partial** (say what is missing), or
**Not done** (say why). Be blunt. The owner would rather present an honest
"partial" than a demo that falls over in front of an examiner.
