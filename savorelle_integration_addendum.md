# SAVORELLE INTEGRATION ADDENDUM (read BEFORE the other prompts; it overrides them where they conflict)

The earlier prompts were written without sight of the real project. The project README shows the actual state. This addendum reconciles them. Inspect the repository first, run `python manage.py test` for a baseline, commit, then apply changes. Do not rewrite what already works.

## 1. Existing contracts that must not change

Front end is frozen. These routes keep their names, methods and response shapes. You may only ADD fields:
`POST /api/auth/register|login|logout/`, `GET /api/auth/me/`, `GET` and revision-checked `PUT /api/workspace/`, `POST /api/scan/`, `POST /api/recipes/generate/`, `POST /api/youtube/import/`, `GET /api/demo-recipes/`.
Stack: Django `>=6.1,<7.0`, Pillow. Tests run with `python manage.py test` and must keep passing, including the existing image decoding and upload validation tests that use the starter images.

## 2. User data stays in the workspace JSON

Signed-in state (inventory, allergies, preferences, custom recipes, saved recipes, history, meal plans, shopping state, recipe notes) already lives in the revision-checked workspace document. Therefore:
- Do NOT create the relational user models from the first prompt (`UserProfile`, `UserAllergen`, `Favorite`, `HistoryEntry`, `MealPlan`, `ShoppingListItem`).
- Create relational tables only for: catalogue (Recipe, RecipeIngredient, RecipeStep, Tag, MealType), knowledge (Allergen, Ingredient, IngredientAlias, IngredientAllergen, Substitution, IngredientNutrition), datasets (Dataset, DatasetItem, Label, embeddings), imports (VideoImport cache), audit and history.
- The allergy engine takes a list of allergen codes plus avoid terms. It reads them from the request payload (the app already sends the selected allergy and avoid settings) and from the workspace on any endpoint that returns suggestions. Map the workspace's allergy labels to allergen codes with a mapping table. A label that maps to no code (custom avoid term) is matched as text against ingredient names and aliases, and an unmatched ingredient fails closed.
- Before writing any workspace data, read the existing code and migration that seed the demo workspace and use exactly that JSON shape. Do not invent a schema.

## 3. Gemini becomes optional

Current behaviour: without `GEMINI_API_KEY` the three AI endpoints return service-unavailable. Change to the provider layer from the first prompt:
- Provider order per task: Gemini (if key), Groq (if key), Ollama (if reachable), local models (CLIP, faster-whisper), CatalogueProvider.
- Keep the explicit error contract: an endpoint returns a provider error only when every provider including the catalogue path has failed. Never fabricate a recipe. Add `provider_used`, `degraded` and `confidence` fields.
- The app must boot and pass all tests with none of the ML packages installed. Put optional packages in `requirements-ml.txt` (torch, open_clip or transformers, faster-whisper, yt-dlp, youtube-transcript-api). If a package is missing, that provider reports unavailable and the router moves on.
- Non-food rejection currently depends on Gemini. Add a local gate: CLIP zero-shot, food versus non-food prompts, with a conservative threshold. Non-food images are rejected before any other step, with the existing error message.
- Training: nothing in this plan needs `ultralytics`. Do not add it to default requirements. If a YOLO model is ever added, note that Ultralytics is licensed under AGPL-3.0 unless a commercial licence is bought, and record that in the README.

## 4. Privacy promises already made must hold

The README says uploaded images are not retained. Therefore:
- `ScanJob` stores no image and no image file path. Remove the `image` field from the first prompt.
- Few-shot memory and user-correction labels store only an embedding vector and the confirmed label, and only when `STORE_SCAN_EMBEDDINGS=1`. Default is off, because the frozen front end has no consent control.
- Image retention for datasets applies only to files an admin uploads through the dataset admin.
- Keep the README statement that images and YouTube links go to Google when Gemini is used, and add that with no Gemini key they are processed locally or by the configured provider.

## 5. Accounts: remove hardcoded credentials

The README publishes working passwords for `admin`, `demo` and `user`, and says migrations create these accounts. That is a vulnerability, not a convenience. Fix it:
- Replace the account-creating migration logic with a no-op for new installs. Do not rewrite applied migration history in a way that breaks existing databases; add a new migration or command for existing databases.
- Add `python manage.py seed_demo` (from the data prompt): passwords only from `SAVORELLE_ADMIN_PASSWORD`, `SAVORELLE_DEMO_PASSWORD`, `SAVORELLE_USER_PASSWORD`; the demo fallback is allowed only when `DEMO_MODE=1`.
- Keep the aliases `savorelle_admin` and `savorelle_demo`.
- Add a Django system check that FAILS when `SAVORELLE_DEBUG=0` and any existing account still verifies against the old published passwords (`AdminPassword123!`, `DemoPassword123!`, `UserPassword123!`). Add a command `rotate_default_accounts` that forces a reset.
- Remove the passwords from the README. Replace with: how to set the environment variables, and that demo login exists only in `DEMO_MODE`.
- Admin URL configurable via `ADMIN_URL`. Rate-limit login.

## 6. Data changes that update README claims

- `/api/demo-recipes/` now serves the enriched recipes from the database. The README sentence "records have no ingredient quantities or verified nutrition, so the app does not use them for matching, meal planning, or shopping" becomes: recipes carry gram quantities and computed nutrition estimates (about 15 percent error), are unreviewed until an admin marks them reviewed, and are used for matching, planning and shopping only when published. Never display "verified" for unreviewed items.
- Existing browse-only behaviour is preserved for any client that expects the old fields; new fields are additive.

## 7. Dependencies on Django 6.1

Before adding `django-import-export` or `django-simple-history`, confirm each release supports the pinned Django version and Python version. If a package does not, do not downgrade Django. Implement a minimal replacement instead: a history table written by a `post_save` and `pre_delete` signal, and a CSV or JSON import view with a dry-run step in the admin. Report the decision.

## 8. Tests

- All existing tests pass unchanged.
- New tests use Django's test runner (`TestCase`); `pytest-django` is optional.
- Add: provider fallback with no keys; non-food rejection with no Gemini; scan endpoint stores no image bytes; default-account check fails with old passwords; workspace PUT revision conflict still behaves as before; allergy mapping from workspace labels including a custom avoid term.

## 9. Order

1. Baseline: run existing tests, commit.
2. Section 5 (credentials), because it is a security fix and independent.
3. Catalogue and knowledge tables, loader, golden allergy test (data prompt).
4. Provider layer, local scan and non-food gate (backend prompt plus scan addendum).
5. YouTube pipeline.
6. Admin, dashboard, demo seed into the workspace shape.
7. README rewrite: credentials removed, optional ML install, data limits, privacy statements above.
