# Savorelle Implementation Update

**Purpose:** Compare the original plan with the current project.  
**Date:** 15 October 2026  
**Status:** The latest verification pass fixed an allergy-filter false positive
(`egg` incorrectly matching `eggplant`), added a quiet list of recipes excluded
by allergy settings, exposed the 50 supplied recipe examples as a browse-only
catalogue, and improved static-asset cache busting. The visual design and
workspace schema are unchanged. A subsequent scan-hardening change removed all
simulated/local scan suggestions: scans require a hosted AI provider, classify
food/non-food, and reject non-food images with a clear message.

Google Gemini now backs photo scanning, recipe generation, and public YouTube
recipe extraction. See [README.md](./README.md) for current setup; the following
sections preserve earlier implementation history.

The latest validation ran all 24 Django core tests and reported no Pylance
problems in the changed Python files. No Gemini API key is configured in this
environment, so live provider calls still require the operator to configure
one before use.

See [documentation.md](./documentation.md) for the project's structure,
proposed ontology, target architecture, and module descriptions.

## 1. Executive summary

The project has moved from a static frontend prototype toward a Django-served
application. The current frontend includes the principal ingredient, recipe,
library, planner, shopping, account, and import screens. Django provides
registration/login/logout, a per-user JSON workspace, and an image-validation
endpoint. Guests can retain workspace state in browser storage; signed-in
workspace data is saved to SQLite. The recipe page also exposes the supplied
50-example dataset through a browse-only catalogue; because it has no ingredient
quantities or verified nutrition, it is excluded from matching, planning, and
shopping.

The important distinction is that **the workflow is not accuracy-verified**.
Photo analysis, recipe generation, and YouTube extraction use Gemini when a
server-side key is configured and have no simulated fallback. Recipe
quantities and nutrition are estimates. The database stores the workspace as
JSON rather than as the normalized recipe, pantry, plan, and shopping entities
proposed in the ontology.

## 2. Project changes made before this documentation

### Frontend and user interface

- Extracted the original page into `index.html`, `web-assets/styles.css`, and
  `web-assets/app.js`.
- Kept a responsive, full-width hero, existing page layout, palette switch,
  and module navigation.
- Added a Services navigation link and circular logo treatment.
- Added the Scan food camera/file picker, preview, drag-and-drop image input,
  manual ingredient entry, editable scan suggestions, and confirmation into
  inventory.
- Added common allergy toggles and a user-defined food-to-avoid entry.
- Added inventory editing, recipe preferences and suggestions, recipe details,
  saved recipes/history, weekly planning, shopping, and YouTube import screens.
- Added shared ingredient-name and unit matching for recipe coverage, shopping
  totals, bought-item stock updates, and scan/manual inventory additions.
- Added inventory validation for non-empty names and bounded, non-negative
  quantities; duplicate normalized names with compatible units merge instead
  of creating duplicate rows.
- The dark-theme button accent was changed to lavender while retaining the
  separate terracotta palette's orange accent.

### Backend and application wiring

- Added Django project configuration and a `core` application.
- Added Django user registration, login, logout, password validation, session
  handling, and CSRF-protected state-changing requests.
- Added a `UserWorkspace` model with a JSON workspace and revision number.
- Connected the frontend to workspace read/write APIs. Guest state uses
  browser storage; authenticated state syncs with the Django backend.
- Tightened workspace recipe validation: generated markers must be booleans,
  custom IDs must be unique, plans/favorites/history may only reference known
  recipes, and custom recipe version snapshots are validated and capped at 10.
- Added custom recipe editing and restoration of prior versions. Edits retain
  stable recipe IDs so favorites, history, meal plans, and notes remain linked.
- Added OpenAI vision analysis behind the existing `/api/scan/` workflow. With
  `OPENAI_API_KEY`, it classifies food versus non-food, identifies dish names,
  and returns schema-validated ingredient suggestions. Without the key, scans
  fail explicitly; no guessed/demo suggestions or local detector output is
  returned.
- Synced selected allergy categories and custom foods-to-avoid with photo
  analysis. The backend prompts the provider to exclude matching ingredients,
  independently filters returned candidates, and the frontend filters again
  before inventory confirmation. Blocked suggestions are reported. This does
  not identify hidden ingredients or guarantee allergy safety.
- Added inline OpenAI data-use and retention disclosure. Uploaded images are
  not retained by Savorelle; standard OpenAI API abuse-monitoring logs may
  retain submitted content up to 30 days. The `store: false` option is set on
  Responses API requests. OpenAI's API data is not used to train models by
  default. Provider usage may incur charges on the server operator's account.
  No API key is currently configured in this environment.
- Added image file format, size, dimension, and decode validation at
  `POST /api/scan/`. Image bytes are processed for the request and not retained
  by this application.
- Added a replaceable detector seam and optional Ultralytics training script.
  This is integration scaffolding; it is not a trained model.
- Added setup, data, and training notes in `README.md` and `training/README.md`.

### Supplied files and datasets

- Inspected and retained the supplied food-image and recipe archives.
- Tests validate image decoding, recipe CSV/JSON consistency, and image-scan
  endpoint handling.
- The generated dish images are not used as ground-truth model labels.
- The 50 illustrative recipe records are served through `/api/demo-recipes/`
  in a clearly labeled browse-only catalogue; they do not participate in
  matching, planning, or shopping.
- Allergy matching now uses ingredient-term boundaries for allergy categories
  (so Egg does not block eggplant); custom avoid terms remain name-based.
- Photo scan results no longer fall back to deterministic demo candidates.
  Non-food model classifications return HTTP 422 with “No food detected.
  Please provide a valid image of food.” If OpenAI is not configured, the
  endpoint returns HTTP 503 and explains how to enable photo analysis.
- Matching recipes are excluded from suggestions and named with their matching
  ingredients in a user-visible warning. This is not a food-safety guarantee.
- The static JavaScript asset versions are incremented when updated to prevent
  browsers from retaining stale frontend logic.

## 3. Feature-by-feature comparison with the original plan

| # | Original requirement | Current state | Difference / remaining work |
| --- | --- | --- | --- |
| 1 | Food-image upload | **Implemented as a UI flow** with camera/file picker, preview, and drag/drop. Backend accepts JPEG, PNG, and WebP. | Upload is not saved as a user image record. It is used for a scan request only. |
| 2 | AI ingredient detection | **Provider-dependent.** OpenAI vision is wired to the scan endpoint, including food/non-food classification. If no key is set, it returns an explicit unavailable response and no suggestions. | No OpenAI key, verified ingredient dataset, or measured precision/recall/mAP is available in this environment. |
| 3 | Manual ingredient entry | **Implemented in frontend.** Users can enter ingredients in Scan food and recipe creation. | Manual data currently resides in frontend workspace state; there is no separate pantry API. |
| 4 | Ingredient inventory | **Implemented in frontend and included in workspace sync.** | Persisted as a JSON list rather than normalized ingredient/inventory rows. |
| 5 | Add, edit, remove, and update quantities | **Implemented for inventory and scan review.** | The UI offers `g`, `ml`, and `pc`; the matcher converts mass and volume prefixes and recognizes common unit aliases. Other units require exact unit-name agreement. |
| 6 | Dietary preferences | **Partial.** Diet, cooking-time, difficulty, common allergies, custom avoid terms, and calorie-plan controls are present. | Cuisine preferences are not present. Allergy categories use term-boundary matching and custom avoid terms use name matching; neither can detect hidden ingredients or guarantee safety. |
| 7 | AI recipe generation | **Not implemented as a live AI service.** A template-based demonstration generator creates a recipe from entered inventory. | No LLM/API provider, prompt/schema validation service, or generated-recipe backend endpoint is connected. |
| 8 | Recipe details | **Present using the current sample/template data.** Includes ingredients, quantities, steps, time, difficulty, and displayed nutrition fields. | Sample and generated values are not independently verified; generated quantities/nutrition should not be treated as accurate. |
| 9 | Recipe customization | **Implemented for custom recipes.** Users can edit metadata, ingredient lines, and steps; up to 10 prior versions can be restored. | Built-in recipes remain read-only; generated quantities and nutrition are still estimates. |
| 10 | Multiple recipe suggestions | **Partial.** Eight static recipe examples are ranked/filtered; generated recipes are added to the in-memory catalog. | Generation produces one template-derived result per action rather than several validated AI alternatives. |
| 11 | Recipe selection | **Implemented in the current interface.** A user can open recipes and assign them to the planner. | Selection is not backed by a dedicated recipe record/API. |
| 12 | Favorite recipes | **Implemented in frontend workspace state and synchronized for signed-in accounts.** | Favorites are recipe IDs in JSON, not relational `Favorite` rows. |
| 13 | Recipe history | **Implemented in frontend workspace state and synchronized for signed-in accounts.** History is capped at 30 entries. | History is not a separate model/table, and history durability depends on workspace sync. |
| 14 | Weekly meal schedule | **Implemented in the frontend.** Seven days and four meal slots are rendered; calorie target, strict-mode checks, and auto-plan are also present. | Plan data is stored as a JSON object, not `MealPlan`/`MealSlot` records. Automated planning is rule-based, not optimized or nutritionally validated. |
| 15 | Ingredient requirement check | **Implemented in the frontend matcher.** Common singular/plural names and selected synonyms normalize; mass and volume units convert within their dimensions. | There is no canonical database catalog. Alias coverage is intentionally limited; unknown units only match the same normalized unit. No density or household-unit conversion is inferred. |
| 16 | Shopping list | **Implemented as a computed frontend list** from scheduled meals and inventory; bought items can be added to inventory. | It is not a persistent `ShoppingList`/`ShoppingItem` model. Domain tests and broader alias coverage remain useful. |
| Additional | YouTube recipe import | **UI flow only; simulated.** A valid-looking video ID selects a sample recipe and labels it as imported. | No transcript, description, or external extraction service is connected. It must not be presented as actual video extraction. |
| Additional | Account and cross-device sync | **Backend foundation implemented.** Django accounts and workspace APIs use sessions and a revision check. | Cross-device availability requires deployment of the same backend with persistent shared storage. No production hosting is configured. |

## 4. Target architecture compared with current architecture

| Area | Original proposal / target | Current implementation |
| --- | --- | --- |
| Django organization | Separate accounts, vision, pantry, recipes, planner, and shopping apps | One `core` Django app contains API views, the workspace model, and the browse-only recipe-data endpoint. |
| AI/service boundary | `services/detector.py`, `generator.py`, `matcher.py` | `core/detection.py` uses OpenAI vision for photo analysis and food/non-food classification. Recipe generation remains simulated; there is no scan fallback. |
| Persistence | Relational entities for users, ingredients, recipes, plans, slots, and shopping items | Django auth tables plus one `UserWorkspace` JSON field per user; recipes remain primarily in JavaScript. |
| Frontend | HTML, CSS, JavaScript | Existing HTML, CSS, and JavaScript are served by Django static-file handling. |
| Recipe data | Shared validated recipe schema and stored recipe relations | Eight interactive browser recipes, browser-generated templates, and 50 browse-only sample recipes served from `recipes.json`. |
| Vision model | Pretrained or otherwise selected model/API behind an adapter | OpenAI provider is integrated but no API key is configured. Supplied images do not contain verified labels suitable for detector training. |
| Recipe-generation model | LLM/API with structured output and validation | No live LLM or recipe-generation endpoint. |
| Evaluation | Hold-out, labeled image set and model metrics | Dataset integrity and image-decoding tests exist; no detector accuracy experiment has been run. |

The visual redesign prompt contained later in the supplied pasted text was not
used as a design brief. The existing frontend design was intentionally not
redesigned for this documentation task.

## 5. Current data model versus proposed ontology

### Persisted relational data now

- Django's built-in user/authentication and session records.
- `core.UserWorkspace`: one-to-one with a user; stores workspace JSON, a
  revision, and update time.

The workspace JSON may include inventory, favorites, history, plan, bought
items, allergy and avoid lists, diet/time/difficulty preferences, calorie
settings, notes, and custom recipes.

### Not yet modeled as separate database entities

There are no dedicated models for `DietaryProfile`, `FoodImage`,
`DetectedIngredient`, `Ingredient`, `UserIngredient`, `Recipe`,
`RecipeIngredient`, `RecipeStep`, `Favorite`, `HistoryEntry`, `MealPlan`,
`MealSlot`, `ShoppingList`, or `ShoppingItem`.

Consequences include fewer database-level constraints, less relational
queryability, and no persistent image provenance or relational recipe-version
records. Custom recipe snapshots are stored inside workspace JSON. That JSON
workspace works as a prototype persistence boundary, but it does not by itself
deliver all the integrity properties of the proposed ontology.

## 6. Known correctness and reliability gaps

These are reasons not to claim the product is already perfect or 100% accurate:

1. **Detection quality:** Live OpenAI analysis requires a server-side
    `OPENAI_API_KEY`; without it photo scans are unavailable. A successful
    result does not prove an ingredient was recognized accurately, and visible
    dish images cannot establish every recipe ingredient or exact quantity.
2. **Allergies:** Allergy-category terms use word boundaries and simple plural
    matching; user-entered avoid terms remain name-based. Neither detects hidden
    ingredients, cross-contact, brand/label variations, or medical safety.
3. **Recipe generation:** Template output is not an LLM result and is not
    validated against external nutritional data.
4. **Recipe editing:** Custom recipes support ingredient, step, metadata, and
    nutrition edits with up to 10 restorable snapshots. Built-in recipes remain
    read-only, and history is stored inside JSON rather than relational records.
5. **YouTube import:** Recipe selection by video ID is a placeholder, not
    extraction from a transcript or description.
6. **Shopping matcher:** Common plural forms and selected synonyms are
    normalized, and mass/volume units are converted within their dimensions.
    There is no canonical ingredient catalog, and unsupported synonyms or
    incompatible/unknown units can still produce separate shopping entries.
7. **Sync conflicts:** The backend returns the latest workspace on a revision
    conflict, and the frontend adopts it. A deliberate merge or conflict-review
    experience is not implemented.
8. **Production deployment:** SQLite, development defaults, and the local
    development server are not a public production deployment. Production
    secret, host, HTTPS, persistent database, static hosting, backups, and
    retention settings still need environment-specific configuration.
9. **Coverage:** Existing tests cover account/workspace APIs and supplied
    dataset validation, but do not prove every frontend interaction, browser,
    viewport, data edge case, or end-to-end workflow correct.

The previously identified navigation/startup issue has been addressed:
`go(id)` now renders the selected module without reloading workspace state, and
`startApp()` runs once at page startup. Startup now renders loaded guest state
without saving before initial state hydration, preventing a default render from
overwriting local pantry or plan data on reload.

Generated recipes now use the backend's boolean `gen` contract, with legacy
truthy markers normalized during workspace loading. Custom recipe capacity is
limited to the backend's 100-record maximum; invalid stored recipe references
are filtered before rendering.

The requested hidden image-understanding behavior is wired into the existing
Scan food flow, not exposed as a new module. With `OPENAI_API_KEY` configured,
photos are analyzed for a dish name and ingredient candidates even when the
dish is absent from the local recipe set. Allergy and custom avoid settings are
sent with the request; matching items are filtered by the server and again
before inventory confirmation. A user must still review the estimates, and
ingredient detection does not guarantee allergy safety. The implementation is
covered by mocked-provider and browser tests, but no live provider request was
made because this workspace has no OpenAI key configured.

## 7. Supplied data assessment

| Supplied item | Observed contents | Current use | Appropriate next use |
| --- | --- | --- | --- |
| `food_image_starter_dataset.zip` | 20 generated JPEG dish images and readme | Image decoding / scan endpoint tests | UI or integration testing only unless images receive verified labels and usage rights are confirmed. |
| `world_food_diverse_starter_dataset.zip` | 68 generated collage-crop JPEG images and readme | Dataset integrity tests | Not ground truth for ingredient or dish classification as supplied. |
| `world_food_recipe_training_bundle.zip` | 50 recipe rows plus duplicate images/archive material and readmes | Not extracted over the other files; no live model training | Recipe-data exploration after schema review; not a computer-vision label set. |
| `recipes.csv`, `recipes.json` | 50 matching illustrative recipe records with no ingredient quantities or nutrition | Data-integrity tests and a browse-only catalogue | Verify quantities, safety, provenance, diet labels, and licensing before integrating with matching, planning, or shopping. |
| `Global Flavors Food Collage.png` | Generated collage of complete plated dishes | No model-label use | Visual/UI testing only; dish appearance does not prove the full ingredient list. |
| `New folder/index.js`, text files | Small unrelated Node filesystem example | Not part of Savorelle workflow | Leave separate unless a specific purpose is established. |

No training or accuracy evaluation was run on these images because the labels
required to measure ingredient detection are absent. Treating filenames or
recipe ingredients as image truth would produce misleading metrics.

## 8. Validation performed to date

The latest verification pass completed:

- Django system and migration checks passed; all 17 Django tests passed.
- All 7 Node ingredient-matching tests passed; both frontend JavaScript files
  passed syntax checks.
- The admin superuser can open `/admin/`; the ordinary demo account can read its
  seeded workspace through the authenticated API.
- With no OpenAI key configured, the uploaded `Global Flavors Food Collage.png`
  received an explicit unavailable response and no ingredient suggestions.
- A browser test with a mocked HTTP 422 verified the exact non-food message,
  zero suggestions, and a disabled confirmation control. Backend tests also
  cover the non-food response and malformed provider results.
- Browser verification confirmed that Egg blocks `egg` but allows `eggplant`;
  confirming scan candidates updates inventory.
- The recipe warning names recipes and matching allergy terms that were
  excluded. The sample catalogue loads 50 records and filters the basil query
  to four records without adding them to live recipe/planner calculations.
- A generated recipe appeared in about 285 ms in the browser; editing and
  restoring its custom-recipe version succeeded.
- A planned Vegetable Pulao produced the expected carrot/pea shortages; marking
  them bought updated inventory and cleared the shortages.
- At a 375-pixel viewport, document width was 360 pixels. The tested page
  sequence reported no HTTP responses with status 400 or higher.
- No live OpenAI request was possible because `OPENAI_API_KEY` is not configured.

Earlier implementation work reported:

- Nine Django tests passing, covering registration/workspace persistence,
  stale revisions, image rejection/acceptance, current homepage content, and
  supplied image/recipe data integrity, plus custom-recipe persistence and
  recipe-reference and version-history validation.
- Django system checks and migration checks passing.
- Frontend JavaScript syntax and Prettier checks passing.
- Browser verification of sign-in, a workspace read, sign-out, and dark versus
  terracotta button colors.
- After the navigation fix, browser verification confirmed that guest inventory
  data remained present after navigating between Inventory and Recipes, and
  that page navigation did not trigger additional account API requests. A
  temporary test ingredient was removed afterward.
- Six Node regression tests pass for ingredient aliases/plurals, compatible
  unit conversions, incompatible-unit rejection, and legacy shopping keys.
- A browser check on a fresh local Django server confirmed that adding
  `chickpea` quantity merges with existing `chickpeas`, planned recipe
  requirements report the correct `50 g` spinach shortage, and marking that
  shortage bought updates inventory so the planned recipe is covered.
- A reload regression confirmed the guest inventory and planned meal survive
  page reload and still produce the expected shopping shortage.
- A browser check confirmed a generated recipe, favorite, history entry, and
  planner assignment survive a reload in guest storage.
- A legacy workspace marker (`gen: 1`) is upgraded to the boolean recipe
  contract, and dangling references to absent recipes are filtered before
  rendering.
- Browser CRUD checks confirmed add, rename, quantity edit, remove, duplicate
  merge, and rejection of empty names and negative quantities. The seven Django
  tests also passed, including authenticated workspace persistence.
- Browser testing confirmed that a generated custom recipe can be edited,
  retains its stable ID, saves the previous snapshot, and restores that version.
- Django API tests confirmed custom recipe snapshots round-trip and malformed
  snapshots are rejected; frontend syntax diagnostics and the six matching
  regression tests passed.
- Added mocked-provider tests for Responses API image requests, structured dish
  and ingredient results, `store: false`, allergy filtering, simulated-result
  allergy filtering, invalid allergy input, and explicit provider/network
  failures. The Django suite now passes 13 tests; JavaScript syntax checks and
  all six ingredient-matching tests pass.
- Browser testing confirmed that with the Egg allergy selected, photo
  suggestions matching egg are withheld and do not increase egg inventory when
  the remaining suggestions are confirmed.
- At a 375-pixel viewport, both Home and Recipes had a document width of 360
  pixels, with no horizontal overflow.

These are useful checks but not a complete acceptance test for all features.

## 9. Recommended next steps toward the stated goal

The goal of a reliable, fully working frontend should be treated as an
acceptance target, not as a status already achieved. A low-risk order is:

1. Configure `OPENAI_API_KEY` in the Django server environment and test with a
   real OpenAI account/image; collect verified labels and report held-out
   metrics before claiming ingredient-level accuracy. The non-food rejection
   and food-response schema have mocked tests, but are not live-provider
   accuracy-certified.
2. Replace recipe-generation and YouTube-import simulations with working
   integrations, or keep both controls clearly labeled as demonstrations.
3. Test shopping-list aggregation, bought-item stock updates, sync conflicts,
   invalid data, API/network errors, keyboard operation, and supported screen
   sizes.
4. Configure and test a hosted backend, production database, HTTPS, secrets,
   backups, static assets, and data-retention behavior before claiming
   cross-device production sync.
5. Add decorative images supplied by the user only after functional work,
   hidden image logic, and final validation are complete.
