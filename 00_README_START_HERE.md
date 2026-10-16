# SAVORELLE: ANTIGRAVITY PACK

Goal: hand Antigravity everything it needs to finish the back end, the database,
the AI features and the internet connections, **without touching the approved front-end design**.

## Files

| File | What it is | Who reads it |
|---|---|---|
| `01_MASTER_PROMPT.md` | The prompt you paste into Antigravity (rules, phases, stop conditions) | You paste, agent obeys |
| `02_FEATURE_AND_WORKFLOW_SPEC.md` | Every module, every hidden behaviour, every workflow, open decisions | Agent |
| `03_DATABASE_DESIGN.md` | ERD, models, invariants, safe migration from the JSON workspace | Agent |
| `04_API_CONTRACT.md` | Frozen endpoints, extended scan, new generate and import endpoints | Agent |
| `05_AI_AND_INTERNET_INTEGRATION.md` | Providers, prompts, schemas, scan v2, YouTube pipeline, nutrition, evals | Agent |
| `06_ACCEPTANCE_TESTS_AND_KNOWN_BUGS.md` | 9 bugs found in your code, 56 acceptance tests, demo script | Agent and you |
| `.env.example` | Every environment variable, all empty | You fill in |

## Setup (10 minutes)

1. In your Savorelle project root, create `docs/antigravity/` and copy all files here into it.
2. Copy `.env.example` to `.env` in the project root and add `.env` to `.gitignore`.
3. Open the project in Antigravity. Paste the text of `01_MASTER_PROMPT.md` (everything below its divider line).
4. When it shows its plan, check it against section "Execution plan" of the master prompt. Approve only if it starts with Phase 0 and does not touch `styles.css` or the HTML layout.
5. Review the progress file `docs/antigravity/PROGRESS.md` after each phase, not only at the end.

## What YOU must supply (the agent cannot invent these)

1. **An AI provider key.** Pick one (OpenAI or Gemini) and put the key in `.env`. Gemini keys come from Google AI Studio; check the provider's current free tier and terms yourself.
2. **A USDA FoodData Central key** (free, from api.data.gov). Without it, calories are model estimates and will be labelled that way.
3. **A YouTube Data API key** (Google Cloud console, free quota). Without it, YouTube import has less to work with.
4. **At least 50 labelled food photos** (dishes, fridge shots, groceries, packaged items, 10 non-food). Without them accuracy is reported as "not measured". Do not let anyone tell you a number without this.
5. **Decisions D1 to D7** in file 02 section 7. The defaults are fine to start; read D2 and D3, they change calorie and shopping math.
6. **A deployment target** (for P7). Say which one before Phase 7.

## Honest expectations

- Scan from a photo is an estimate. It gets ingredient names mostly right on clear photos, quantities only roughly, and hidden ingredients never. The review step is the safety valve.
- YouTube import depends on what the video exposes (description, captions). Some videos will return "no recipe found". That is correct behaviour.
- Free API tiers have rate limits. Demo with a paid or generous key, and test the day before.
- This pack tells the agent to report anything it could not verify live. Read that report.
