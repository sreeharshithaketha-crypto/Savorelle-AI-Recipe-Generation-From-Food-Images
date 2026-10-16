# SAVORELLE BACKEND BUILD PROMPT (for Antigravity)

You are building the working backend for Savorelle ("AI RECIPE GENERATION FROM FOOD IMAGES"), a Django project that runs locally on port 8002. The front end is APPROVED AND FROZEN. Do not change its layout, copy, themes, or module behaviour. You are wiring real logic, a real database and real AI connections behind it.

Read this entire prompt before writing code. Build in the phases at the bottom. After each phase, run its tests and show real output. Do not fake results, do not hardcode demo answers, do not mark a phase done if a test fails.

Attached data:
- `recipes.csv` and `recipes.json`: 50 seed recipes, 121 raw ingredient strings, about 4 terse steps each. This is the seed catalogue, not a training set.
- `seed_ontology.json`: hand-built allergen list, 107 canonical ingredients with allergen tags, aliases, and substitution options. It covers every ingredient in the 50 recipes. Load it as seed data. Extend it, never shrink it.
- `world_food_diverse_starter_dataset.zip`: 48 collage crops plus 20 starter images. Its own README says the images are synthetic and the labels are NOT verified. Import it as an UNVERIFIED dataset for UI testing only. Never train on it, never use it to report accuracy.

## 0. Hard rules

1. No paid API is required to run anything. Every module must work with zero keys via local models or the catalogue fallback. A key only upgrades quality.
2. Allergy decisions are made by deterministic code against the database. An LLM never decides whether food is safe. It may only propose ingredients; code decides.
3. Fail closed. Unknown ingredient, unknown role, unparseable text: treat as possibly allergenic and say so. Never display "safe" for something you could not verify.
4. Every AI output passes JSON-schema validation before it touches the database. Invalid output is retried once, then falls to the next provider, then to the catalogue. Never crash a request.
5. Do not invent facts. If a recipe, quantity or step is not supported by the source (photo, catalogue, video), mark it `source=inferred` and `confidence` accordingly.
6. UI copy rules from the design brief still apply to anything you render: no emojis, no em dashes.
7. Use Django, SQLite by default, settings ready for PostgreSQL via `DATABASE_URL`. Python 3.11+. Pin dependencies in `requirements.txt`. Secrets only from environment variables, never committed.

## 1. Architecture

One canonical pipeline. All three entry points (Scan Food, Import YouTube Recipe, Enter Ingredients) produce the same object and flow through the same stages. This is what makes YouTube work "just like scan".

```
input (image | url | typed ingredients)
  -> Extractor            (module specific)
  -> RecipeDraft          (canonical schema, section 5)
  -> Normalizer           (ingredient canonicalisation, units, roles)
  -> AllergyEngine        (deterministic, section 4)
  -> Validator            (step quality, completeness)
  -> Persist              (Recipe + history + dataset feedback hooks)
  -> API response
```

Provider layer (`savorelle/providers/`). Views never call a model directly.

```
BaseProvider: detect_dish(image) -> list[DishGuess]
              detect_ingredients(image) -> list[IngredientGuess]
              generate_recipe(dish, ingredients, constraints) -> RecipeDraft
              extract_recipe(text, meta) -> RecipeDraft
Providers:    GeminiProvider (if GEMINI_API_KEY), GroqProvider (if GROQ_API_KEY),
              OllamaProvider (if daemon reachable), LocalVisionProvider (CLIP, always),
              CatalogueProvider (always works, no model)
get_provider(task) picks the best available per task, with timeouts, retries and a health check cached for 60 seconds.
```

Every response carries `provider_used`, `confidence`, and `degraded: true/false` so the UI can show an honest state.

## 2. Database (real, relational, stores data and datasets)

Create Django models with migrations. Use proper FKs, unique constraints and indexes.

Knowledge:
- `Allergen(code unique, label)`
- `Ingredient(name unique canonical, category, parent nullable, is_generic bool)`; `IngredientAlias(ingredient FK, alias unique lowercase)`
- `IngredientAllergen(ingredient FK, allergen FK, kind: definite|may_contain)`
- `Substitution(ingredient FK, removes_allergen FK, option_text, option_ingredient FK nullable, note)`

Recipes:
- `Recipe(id, title, slug, cuisine, diet_type, prep_time_min, cook_time_min, servings, difficulty, origin: seed|generated|youtube|user, review_status: unreviewed|reviewed|rejected, source_url nullable, source_video_id nullable, created_at)`
- `RecipeIngredient(recipe FK, ingredient FK nullable, raw_text, quantity nullable, unit nullable, role: core|major|minor|garnish|optional, prep_note, alternatives_json, source: seed|visible|inferred|stated, confidence)`
- `RecipeStep(recipe FK, order, title, instruction, duration_min nullable, heat: none|low|medium|high, equipment, ingredients_used M2M, doneness_cue, tip, timestamp_sec nullable)`; keep `original_instruction` for steps that were later enriched.
- `NutritionEstimate(recipe FK, kcal, protein_g, carbs_g, fat_g, method)` for the strict calorie planner; compute from an ingredient nutrition table, mark as estimate.

Users and activity:
- `UserProfile(user FK, diet_preference, daily_kcal_target)`; `UserAllergen(user FK, allergen FK, severity)`
- `ScanJob(id, user, image, image_sha256, status, provider_used, created_at)`; `DishGuess(scan FK, dish FK nullable, label, score)`; `IngredientDetection(scan FK, ingredient FK nullable, raw_label, score, source)`
- `VideoImport(id, user, url, video_id unique, status, method: description|captions|whisper|failed, language, transcript_text, recipe FK nullable, error_code, created_at)`  (this is the cache: never process the same video twice)
- `Favorite`, `HistoryEntry`, `MealPlan(user, date, meal: breakfast|lunch|snack|dinner, recipe FK)`, `ShoppingListItem`

Datasets (store datasets as first-class data):
- `Dataset(name, version, kind: dish_classification|ingredient_detection|recipe_text, source, license_note, verified bool, readme_text, created_at)`
- `DatasetItem(dataset FK, file, sha256 unique per dataset, source_group, split: train|val|test|unassigned, width, height, embedding_json nullable)`
- `Label(item FK, label_type: dish|ingredient, dish FK nullable, ingredient FK nullable, bbox_json nullable, origin: human|model|user_correction, verified bool, verified_by nullable, created_at)`
- Store files under `media/datasets/<name>/<sha256>.<ext>`. Splits are assigned by `source_group`, never per image, to avoid near-duplicate leakage.

Embedding index (what replaces training):
- `DishEmbedding(dish FK, text_embedding, image_embeddings_json)` and `IngredientEmbedding`. Rebuilt by a management command and incrementally when a Recipe or confirmed scan is added. Adding a recipe to the database makes it detectable immediately, with no retraining.

Management commands (idempotent, safe to re-run):
- `load_seed_ontology seed_ontology.json`
- `import_recipes recipes.csv|recipes.json` (upsert by `recipe_id`; split "A or B" ingredients into `alternatives_json`; map every raw string through aliases; log anything unmapped and fail the run if unmapped count > 0)
- `import_dataset_zip <zip> --name --unverified` (stores README, hashes files, dedupes, assigns `source_group`)
- `build_embeddings`
- `export_dataset <name> --format imagefolder|csv|coco` (exports only verified labels unless `--include-unverified`)
- `audit_catalogue` (reports recipes with no roles, steps under 5, ingredients missing from steps, unmapped ingredients)

## 3. Ingredient normalizer

- Lowercase, strip, singularize, strip state words (cooked, soaked, fresh, chopped, diced, ground) into `prep_note`.
- Resolve through `IngredientAlias`. Examples that must pass: `tomatoes`->tomato, `eggs`->egg, `bell peppers`->bell pepper, `cooked rice`->rice, `chicken breast`->chicken, `coriander`->cilantro.
- "A or B" strings (`butter or mayonnaise`, `ghee or oil`, `milk or cream`, `milk or water`, `oats or granola`, `stock or water`): store as ONE RecipeIngredient with alternatives. The allergy engine may resolve the line using any option that is safe for the user.
- Generic entries (`nuts`, `herbs`, `whole spices`, `broth`): resolve to the generic ingredient, which carries the conservative allergen tags from the seed.
- Unknown ingredient: create `Ingredient(is_generic=True, category=unknown)` flagged for review, and treat it as possibly allergenic.

Role assignment (`core|major|minor|garnish|optional`), applied in this order:
1. Ingredient name appears in the recipe title (paneer in Paneer Tikka, peanut in Peanut Noodles) -> `core`.
2. Quantity share of total mass >= 15% when quantities exist -> `major`.
3. Category grain, protein, legume, dairy, or a main vegetable with no quantity info -> `major`.
4. Category spice, herb, oil, salt, sugar, condiment, listed last or marked optional -> `minor` / `garnish` / `optional`.
5. ANY ingredient that carries a definite allergen and whose role is not explicit -> `major`. Do not let a nut, dairy or soy ingredient be downgraded by a heuristic. Pesto without pine nuts is not pesto.
Write the roles for the 50 seed recipes to `seed_roles_review.csv` and mark them `unreviewed`. A human reviews this file; do not claim it is verified.

## 4. Allergy engine (the hidden feature)

Pure Python service, no network, no model. `evaluate(recipe, user_allergens) -> Verdict`.

Per ingredient line (after resolving alternatives):
- Definite allergen match with role `core` or `major` -> dish status `EXCLUDED`. The dish is not recommended and is hidden from suggestions. Return the reason ("contains milk as a main ingredient: paneer").
- Definite allergen match with role `minor`, `garnish` or `optional` -> dish allowed as `ADAPTED`: remove or substitute the ingredient using `Substitution`, rewrite every step that mentions it, and tell the user what changed. Re-run the engine on the substitute (a soy-free substitute for a soy-and-gluten user must also be gluten-free).
- `may_contain` match on `core` or `major` -> `CAUTION`: shown below safe dishes with a "check the product label" notice, never silently hidden, never labelled safe.
- `may_contain` on minor/garnish -> keep, add a label-check note.
- After substitution, scan all step text and the title for any removed ingredient or allergen keyword (including aliases such as ghee, paneer, tahini). Any leftover mention fails the check and the dish becomes `EXCLUDED`.
- A config flag `ALLOW_MAJOR_SUBSTITUTION` exists and defaults to `false`. When false, a major allergen is never substituted away.

Source-aware rules:
- Ingredients with `source=visible` come from a photo. Ingredients with `source=inferred` come from the dish name. A photo cannot show butter, ghee, soy sauce or tahini. For any scanned dish, run the engine on the matched catalogue recipe's FULL ingredient list, and add a standing notice: "Some ingredients cannot be seen in a photo. Confirm the ingredient list before eating."
- Generated and YouTube-imported recipes are re-evaluated AFTER generation and AFTER every user edit. The check runs on save, on every API read of a suggestion list, and when a user changes their allergen profile.
- Filtering order for suggestions: SAFE, then ADAPTED, then CAUTION. EXCLUDED never appears. If nothing remains, return an honest empty state, not a relaxed filter.
- Never describe output as medically guaranteed. Every verdict carries `disclaimer` text; the UI shows it near allergy results.

## 5. Canonical schemas (validate with pydantic or jsonschema)

`RecipeDraft`:
```
title, cuisine, diet_type, servings, prep_time_min, cook_time_min, difficulty,
ingredients: [{raw_text, name, quantity, unit, prep_note, role, optional, source, confidence}],
steps: [{order, title, instruction, duration_min, heat, equipment[], ingredients_used[],
         doneness_cue, tip, timestamp_sec}],
source: {type: catalogue|generated|youtube|user, url, video_id, method, language},
notes
```

Step quality rules (the Validator enforces them; failing drafts are repaired once, then flagged):
- At least 5 steps for any cooked dish; each instruction starts with an imperative verb and is under 40 words.
- Every ingredient is used in at least one step (water, salt, oil exempt). No step uses an ingredient absent from the list.
- Each cooking step has heat and a duration or a doneness cue ("until onions turn golden", "until bubbles form").
- Sum of step durations is within 30% of prep + cook time.
- Quantities and units normalised (g, ml, tsp, tbsp, cup, piece). No invented quantities: if absent in the source, `quantity=null`.

Catalogue enrichment command `enrich_steps`: the seed recipes have about 4 terse steps. Expand them into the schema above using the best available provider. Keep `original_instruction`, set `review_status=unreviewed`. The Validator must pass before an enriched version replaces what the UI shows.

## 6. Module: Scan Food (no training required)

Goal: identify the dish type, detect ingredients, return a recipe. Be honest about confidence.

Dish type detection (zero shot, runs locally):
1. Load a CLIP model (`open_clip` ViT-B/32 or `transformers` `openai/clip-vit-base-patch32`) once at startup; cache weights.
2. Candidate classes = all `Dish` rows in the database (title + cuisine + 2 or 3 prompt templates: "a photo of {dish}, a plate of food", "{dish}, cooked meal"). Use stored `DishEmbedding` text vectors.
3. Score the image against every dish; softmax with a calibrated temperature; return top 5.
4. Few-shot memory: for every user-confirmed scan (consent required), store the image embedding under the confirmed dish. At inference, blend zero-shot scores with kNN over stored image embeddings. This improves accuracy over time with no training run.
5. Optional ensemble: if Ollama has a vision model (`qwen2.5vl` or `llama3.2-vision`) or a Gemini key exists, ask it to name the dish constrained to the catalogue list plus "other", and merge scores.
6. Thresholds: top score >= 0.55 and margin over second >= 0.15 -> `confident`. Else `uncertain`: return top 3 and force the user to pick. If the dish is not in the catalogue (`other`), go to generation (below).

Ingredient detection:
1. Preferred: vision LLM (Ollama or Gemini) with a strict JSON schema, vocabulary-constrained to the ingredient table, returning `visible` items only.
2. Fallback without any LLM: CLIP multi-label zero-shot over ingredient vocabulary with a per-ingredient threshold and a cap of 12 items.
3. Merge with the matched dish's catalogue ingredients as `source=inferred`, shown separately from `visible`.
4. The existing add/edit/remove/quantity UI is the confirmation step. Every user edit is stored as a `Label(origin=user_correction, verified=false)` when consent is on.

Recipe generation:
- Catalogue first: if a confident dish match exists, return that recipe (enriched steps) adjusted to confirmed ingredients and allergy verdict.
- Otherwise ground generation in retrieval: pull the 3 nearest catalogue recipes by ingredient overlap, give them to the provider as style and structure examples, generate a `RecipeDraft` constrained to the confirmed ingredient list. With no LLM available, return the nearest catalogue recipes with missing ingredients listed. Never fabricate a recipe without a provider and present it as generated.
- Multiple suggestions: rank by ingredient coverage, then allergy status, then diet fit, then calorie fit. Missing-ingredient check and shopping list read from this ranking.

## 7. Module: Import YouTube Recipe

Must reach scan-level reliability and produce the identical `RecipeDraft`.

Pipeline:
1. Parse URL (watch, youtu.be, shorts, embed) to `video_id`. Check `VideoImport` cache first.
2. Metadata via `yt-dlp` with `skip_download=True`: title, description, duration, language, chapters. Never download video.
3. Extraction priority:
   a. Description: detect an Ingredients block by regex (`ingredients?:`, bullet runs with quantities and units). If both ingredients and method are present, parse them (LLM if available, rule-based parser otherwise).
   b. Captions: `youtube-transcript-api`, then `yt-dlp` subtitle fetch (manual before auto-generated). Keep segment timestamps.
   c. No text at all: download audio only, transcribe locally with `faster-whisper` (model `small`, `task=transcribe`, translate to English with `task=translate` for Telugu and Hindi). Delete the audio file afterward.
4. `is_recipe` gate: classify whether the content is a recipe. If not, return `error_code=NOT_A_RECIPE`, create no recipe.
5. LLM extraction with the strict `RecipeDraft` schema. Long transcripts: chunk by 3 to 4 minutes, extract per chunk, merge, dedupe ingredients, order steps by timestamp. Instructions: "Use only what is said or written in the source. Do not add ingredients or quantities that are not present. Spoken filler removed."
6. No LLM available: rule-based fallback parser (quantity and unit regex for ingredients; sentence split on cooking verbs for steps). Mark `degraded=true`.
7. Run Normalizer, AllergyEngine, Validator exactly as in scan. Store `VideoImport` with `method`, `language`, `transcript_text`, linked `Recipe`.

Error codes returned to the UI (never a stack trace): `INVALID_URL`, `VIDEO_UNAVAILABLE`, `NO_CAPTIONS_AND_AUDIO_FAILED`, `NOT_A_RECIPE`, `RATE_LIMITED` (back off, retry later, show message), `EXTRACTION_FAILED`. Pin and document `yt-dlp` and add a `scripts/update_ytdlp` helper; it breaks when YouTube changes. Expect IP-based blocking of transcript endpoints on cloud hosts.

## 8. Endpoints (JSON, versioned, consistent with the existing front end)

Keep existing route names where the front end already calls them. Add what is missing under `/api/v1/`:
`POST scan` (image) | `POST scan/{id}/confirm` (edited ingredients, dish, consent flag) | `POST recipes/generate` | `POST youtube/import` | `GET recipes`, `GET recipes/{id}` | `GET/PUT profile/allergens` | `GET suggestions` | `POST planner` | `GET shopping-list` | `GET health` (provider status, model readiness, DB) | `GET/POST datasets` (admin) | `POST datasets/{id}/items` (admin).
Existing `/api/demo-recipes/` must keep serving the catalogue, now from the database. Upload limits: images up to 8 MB, JPEG/PNG/WebP only, re-encode and strip EXIF. Rate limit scan and YouTube endpoints. Add Django admin for every model, with dataset and label review screens.

## 9. Tests and acceptance (all must pass with zero API keys)

Allergy engine (table-driven, at least 40 cases). Minimum:
- Peanut allergy: Peanut Noodles `EXCLUDED` (peanut is core). Any recipe with peanuts as garnish only -> `ADAPTED` with sunflower seeds, and steps rewritten.
- Milk allergy: Paneer Butter Masala and Paneer Tikka `EXCLUDED`; Pancakes `EXCLUDED` (milk major) while `ALLOW_MAJOR_SUBSTITUTION=false`; Tomato Basil Pasta not excluded for milk.
- Gluten allergy: pasta, noodles, flour, pizza dough, soy sauce lines flagged; Pizza `EXCLUDED`.
- Soy allergy: Tofu dishes `EXCLUDED`; soy sauce as minor -> `ADAPTED` with coconut aminos, and the substitute re-checked.
- Sesame: Hummus `EXCLUDED` (tahini core or major); Pesto with pine nuts and tree-nut allergy `EXCLUDED`.
- Generic `nuts` line with a peanut allergy -> `CAUTION` or `EXCLUDED`, never safe.
- Unknown ingredient -> never safe.
- Leftover-keyword test: a substituted recipe whose step still says "ghee" must fail.
- Re-evaluation fires when the user's allergen profile changes.

Normalizer: the 121 raw strings all resolve (0 unmapped). "A or B" lines parse into alternatives.

Scan: a held-out set under `eval/` (create the folder, empty, plus a loader script) with a `python manage.py eval_scan` command that reports top-1 and top-3 accuracy and ingredient precision/recall ONLY on verified labels, and refuses to run on unverified datasets. State in the README that accuracy numbers are meaningless until at least 100 verified images are loaded.

YouTube: unit tests with recorded fixtures (description with ingredients; captions only; not-a-recipe; invalid URL; cache hit makes zero network calls). Live smoke test script for a real URL, run manually.

Quality gates: `pytest` green, `python manage.py check` clean, `audit_catalogue` report generated, no hardcoded API keys, `/api/v1/health` reports each provider honestly.

## 10. Build order

1. Models, migrations, `load_seed_ontology`, `import_recipes`, `audit_catalogue`, admin. Serve `/api/demo-recipes/` from the DB.
2. Normalizer, role assignment, AllergyEngine, full allergy test suite.
3. Provider layer, `CatalogueProvider`, `/health`, schema validation, step Validator, `enrich_steps`.
4. Scan: CLIP dish detection, embedding index, ingredient detection, confirm endpoint, user-correction labels, generation.
5. YouTube pipeline, cache, error codes, fixtures.
6. Dataset import/export, `eval_scan`, planner, shopping list, calories.
7. README: setup, env vars, how to add a recipe or dataset, known limits.

## 11. Known limits to state in the README (do not hide them)

- Zero-shot dish detection is good on common dishes and weak on regional or composite dishes. It suggests and the user confirms.
- Photos cannot reveal hidden ingredients; allergy output for scanned food is a warning system, not a guarantee.
- The catalogue has 50 recipes. Retrieval quality is capped by catalogue size.
- Local vision models are slow on CPU. Show progress and a timeout.
- Seed roles and enriched steps are unreviewed until a human marks them reviewed.
