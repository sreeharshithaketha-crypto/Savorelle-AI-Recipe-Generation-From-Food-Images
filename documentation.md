# Savorelle Project Documentation

**Document purpose:** Describe the original project plan, target architecture,
logical ontology, current project structure, system context, modules, and
intended workflow.

**Project title:** AI Recipe Generation from Food Images  
**Application name:** Savorelle  
**Project context:** Internship project  
**Student:** Sree Harshitha Ketha  
**PIN:** 24249-CCN-049  
**Department:** Communication and Computer Networking  
**Institution:** Aditya College of Engineering and Technology  
**Date:** 15 October 2026

> This document records both the intended system and the current implementation.
> A stated requirement or target design is not evidence that the feature is
> already implemented. See [update.md](./update.md) for the implementation
> comparison and known gaps.

## 1. Project overview

Savorelle is intended to help a user turn available food ingredients into
recipes and practical meal plans. The original project idea combines food-image
input, ingredient recognition, user-correctable inventory, dietary preferences,
recipe suggestions, saved recipes, weekly scheduling, and shopping for missing
ingredients.

The target workflow is:

```text
Food image or manual entry
        -> ingredient suggestions
        -> user review and quantity correction
        -> inventory and dietary preferences
        -> recipe suggestions
        -> recipe selection and customization
        -> favorites and history
        -> weekly meal plan
        -> missing-ingredient shopping list
```

Image recognition and recipe generation are assistance features, not sources of
guaranteed truth. Users must be able to review results. Allergy matching by
ingredient names cannot establish that food is safe, and generated quantities,
nutrition, and cooking instructions require verification.

## 2. Existing and proposed systems

### Existing system described in the original plan

The project proposal describes a common manual workflow: users search websites,
applications, or cooking videos for recipes, check ingredients themselves,
track quantities separately, plan meals manually, and work out what to buy.
This description is the project's problem statement; it is not a measured
survey of every existing recipe product.

### Proposed system

The proposal brings the ingredient-to-meal workflow into one application:

1. Accept a food photo or manually entered ingredients.
2. Suggest visible ingredients and let the user correct names and quantities.
3. Maintain an inventory and dietary/allergy preferences.
4. Suggest recipes and show ingredients, quantities, preparation, cooking
   steps, time, and difficulty.
5. Let the user select, scale, customize, save, and revisit recipes.
6. Place recipes into a weekly day-and-meal schedule.
7. Compare scheduled recipe needs with available inventory and list missing
   ingredients.

The proposal recommends isolating replaceable AI integrations behind Python
services. It also proposes separate application areas for accounts, vision,
pantry, recipes, planning, and shopping. These are target architecture choices,
not the shape of the current Django codebase.

### Current system in one sentence

The current application is a responsive HTML/CSS/JavaScript prototype served
through Django, with Django account sessions and a database-backed JSON
workspace. Google Gemini powers photo scanning, recipe generation, and public
YouTube recipe import when a server-side key is configured. Without it, these
features report that analysis is unavailable rather than returning guessed
results. The photo model also rejects images it classifies as non-food. The 50
supplied sample recipes are available in a browse-only catalogue.

## 3. Current project structure

```text
project1/
├── manage.py                         Django command entry point
├── savorelle/
│   ├── settings.py                   Django settings and private vision-provider configuration
│   ├── urls.py                       Root page, API, admin and static routes
│   ├── asgi.py                       ASGI entry point
│   ├── wsgi.py                       WSGI entry point
│   └── __init__.py
├── core/
│   ├── admin.py                      Workspace administration
│   ├── apps.py                       Django application configuration
│   ├── ai.py                         Gemini vision, recipe generation, and video import
│   ├── models.py                     UserWorkspace model
│   ├── urls.py                       API routes
│   ├── views.py                      Authentication, workspace and scan endpoints
│   ├── tests.py                      API and supplied-data checks
│   ├── migrations/
│   │   ├── 0001_initial.py           UserWorkspace migration
│   │   └── __init__.py
│   └── __init__.py
├── web-assets/
│   ├── ingredient-matching.js       Ingredient aliases and compatible-unit conversion
│   ├── ingredient-matching.test.cjs Matching and conversion regression tests
│   ├── app.js                        Frontend state, rendering, and recipe editing/version history
│   └── styles.css                    Frontend layout, theme and responsive styles
├── training/
│   ├── README.md                     Data requirements and training notes
│   └── train.py                      Optional Ultralytics training entry point
├── index.html                        Single-page frontend and module markup
├── recipes.csv                       Supplied recipe examples
├── recipes.json                      Supplied recipe examples in JSON
├── food_image_starter_dataset.zip    Generated dish-level sample photos
├── world_food_diverse_starter_dataset.zip
│                                     Generated collage crops and readme
├── world_food_recipe_training_bundle.zip
│                                     Recipe examples and duplicated images
├── Global Flavors Food Collage.png   Supplied collage image
├── requirements.txt                  Django and Pillow dependencies
├── requirements-training.txt         Optional training dependency
├── README.md                         Local setup and backend notes
├── documentation.md                 This project/architecture document
├── update.md                        Change and status comparison
└── savorelle.sqlite3                 Local development database
```

The actual backend currently uses one Django app (`core`), rather than the
proposed collection of domain-specific Django apps. It does not currently
contain a `services/` package, a `templates/` directory, a normalized
ingredient catalog, or a trained model. `index.html` is served directly, and
the CSS and JavaScript are served from `web-assets/`.

## 4. Target architecture

The following is a logical target, not a claim about current files:

```text
Browser
  index.html + web-assets/styles.css + web-assets/app.js
       |
       | same-origin HTTP, session cookie, CSRF token
       v
Django application
  accounts | vision | pantry | recipes | planner | shopping
       |
       +-- services/detector.py     image -> ingredient candidates
       +-- services/generator.py    ingredients + preferences -> recipe data
       +-- services/matcher.py      recipe needs vs. available inventory
       |
       +-- persistent database and, only if required, media storage
```

Keep model/provider-specific inference and generation behind service
interfaces. A detector or language-model provider should be replaceable without
rewriting the application's views or changing the established frontend
appearance. External AI APIs, model credentials, transcript providers,
deployment services, and data-retention policies have not been selected or
configured.

## 5. Logical ontology

This ontology captures the relationships required by the original proposal. It
is a conceptual model. The current database does not implement these entities
as separate relational models.

| Entity | Suggested attributes | Intended relations |
| --- | --- | --- |
| User | username, email, password hash | Owns a dietary profile and workspace; creates or saves recipes; owns plans and image sessions. |
| DietaryProfile | diet, allergies, foods to avoid, optional cuisine preferences | Belongs to one user; informs recipe filtering/generation. |
| FoodImage | upload reference, uploaded time, processing status | Belongs to a user or scan session; may produce detected ingredient candidates. |
| Ingredient | canonical name, category, canonical unit | Reusable normalized reference for inventory and recipe lines. |
| DetectedIngredient | ingredient candidate, confidence, source image | Belongs to a scan; is reviewed before inventory use. |
| UserIngredient / InventoryItem | ingredient, quantity, unit, source, confidence, availability | Belongs to a user; may refer to an originating image but must also support manual entry. |
| Recipe | name, time, difficulty, servings, source, version, optional owner | Has recipe ingredients and ordered steps; custom recipes are editable, keep up to 10 prior snapshots, and may be saved, viewed, or scheduled. |
| RecipeIngredient | ingredient, quantity, unit | Links one recipe to one ingredient. |
| RecipeStep | order, text, step type | Belongs to one recipe. |
| Favorite | saved time | Links a user to a recipe. |
| HistoryEntry | viewed time | Links a user to a recipe. |
| MealPlan | week start, owner | Contains meal slots for a user and week. |
| MealSlot | day, meal, recipe | Links one meal plan to a recipe. |
| ShoppingList | owner, plan/source, created time | Contains aggregated missing-ingredient items. |
| ShoppingItem | ingredient, required quantity, unit, bought status | Belongs to a shopping list. |

### Key relations and invariants

- A user can maintain many inventory items and dietary preferences; a user
  workspace must never be visible to another user.
- A scan result is a suggestion. The reviewed user inventory is authoritative
  for cooking and shopping decisions.
- Manual inventory entries do not require a FoodImage.
- A recipe contains ingredient lines and ordered preparation/cooking steps.
- Favorites and history link to recipes; they are not copies of the recipe.
- A meal slot points to a selected recipe. A plan is scoped to a user and week.
- Shopping quantities are computed by aggregating planned recipe requirements,
  then subtracting available inventory for equivalent normalized ingredients
  and compatible units.
- The frontend currently normalizes common singular/plural forms and a small
  explicit set of ingredient synonyms before matching.
- The frontend currently converts mass (`mg`, `g`, `kg`), volume (`ml`, `l`),
  and count (`pc`/piece) within their own dimensions. Unknown units match only
  when their normalized names are identical; density-based and household-unit
  conversions are not inferred.
- Ingredient equivalence and unit conversion must remain explicit and testable;
  incompatible units such as grams and pieces must never be compared.

### Controlled vocabularies proposed in the original plan

Use controlled values for source (`manual`, `image`, and any explicitly
supported import source), difficulty, weekday, meal, and unit. Current UI
quantity entry offers `g`, `ml`, and `pc`; the matcher also recognizes mass and
volume prefixes for imported or existing data. Support for additional units or
conversions should be intentional. Do not silently compare incompatible units
such as grams and pieces.

## 6. Module ownership and user-facing feature catalogue

The proposed module ownership groups the original feature list into these
areas:

| Proposed module | Responsibility | Features |
| --- | --- | --- |
| Accounts | Registration, login, profile and dietary settings | Account and dietary preferences |
| Vision | Image upload, detector call, candidate confidence and scan lifecycle | Food image upload and ingredient detection |
| Pantry | Manual entry, review and inventory CRUD | Manual entry, inventory, quantity management |
| Recipes | Generation, validation, details, customization and library | Preferences, suggestions, selection, details, customization, favorites and history |
| Planner | Weekly plan and meal-slot assignment | Weekly scheduling |
| Shopping | Requirement aggregation, inventory matching and bought checklist | Ingredient requirement check and shopping list |

The complete user-facing requirements from the supplied plan are:

1. Food-image upload.
2. Ingredient detection from an image.
3. Manual ingredient entry.
4. Ingredient inventory.
5. Add, edit, remove, and adjust quantities.
6. Dietary preferences.
7. Recipe generation from ingredients and preferences.
8. Recipe details: ingredients, quantities, steps, time, and difficulty.
9. Recipe customization.
10. Multiple recipe suggestions.
11. Recipe selection.
12. Favorite recipes.
13. Recipe history.
14. Weekly meal schedule by day and meal.
15. Compare required ingredient quantities with inventory.
16. Shopping list for missing ingredients.

The current interface additionally has a YouTube import section, a custom
allergy/food-to-avoid input, drag-and-drop image handling, service navigation,
calorie targets, strict meal-plan limits, and automatic week planning. Their
actual state is recorded in [update.md](./update.md).

## 7. Intended existing-system comparison

| Aspect | Existing/manual workflow in the project proposal | Proposed Savorelle workflow |
| --- | --- | --- |
| Recipe discovery | Search websites, apps, or cooking videos | Browse suggestions based on entered or scanned ingredients |
| Ingredient identification | Read recipe lists and inspect available food manually | Use photo suggestions, then have the user verify/correct them |
| Inventory | Track ingredients and quantities informally | Maintain a user-editable ingredient inventory |
| Preferences | Manually screen recipes | Apply diet and allergy/avoidance filters, with their limitations visible |
| Meal planning | Plan separately | Assign selected recipes to a seven-day meal schedule |
| Shopping | Compare recipes and pantry by hand | Aggregate planned recipe needs and list the shortage |

This table describes the project's intended comparison, not a comparative
benchmark against named commercial products.

## 8. Data and model boundaries

The supplied `recipes.csv` and `recipes.json` contain matching illustrative
recipe records with ingredient names and instructions but no ingredient
quantities or verified nutrition. `/api/demo-recipes/` serves these records to a
clearly labeled, searchable, browse-only catalogue. Tests check their row count,
IDs, basic fields, and parseability. They are excluded from recipe matching,
planning, and shopping until their quantities and nutrition are verified.

The supplied image archives contain generated dish-level photographs and
collage crops without verified ingredient labels or bounding boxes. They are
used for image-decoding and endpoint tests only. They are not valid ground truth
for ingredient detection and do not support accuracy claims. Review
[training/README.md](./training/README.md) before supplying a future dataset.

The image archives do not provide the verified labels needed to train a
detector, so the app uses Gemini's hosted multimodal model rather than claiming
to use a locally trained ingredient detector. Configure the server-side
`GEMINI_API_KEY` to enable `POST /api/scan/`, `POST /api/recipes/generate/`,
and `POST /api/youtube/import/`. Without the key, endpoints return an explicit
service-unavailable response and no simulated candidates.

Photo uploads are sent to Gemini for structured food classification and
visible-ingredient suggestions; non-food images are rejected. Allergy and
avoid settings accompany scans and generated recipe requests, and matching
ingredients are withheld or rejected server-side. Public YouTube video content
is sent to Gemini for recipe extraction; private and unlisted links are not
supported. Savorelle does not persist uploaded images or video content. Review
Google's current [Gemini API data-use terms](https://ai.google.dev/gemini-api/terms)
and [pricing](https://ai.google.dev/gemini-api/docs/pricing). The key must
remain in the server environment, never browser code or committed source.
Visual ingredient quantities and generated nutrition are estimates; neither
image nor recipe analysis guarantees allergen safety.

Custom recipes can be edited without changing their IDs, so saved references in
favorites, history, and meal plans remain valid. Each edit stores the previous
recipe content, with up to 10 snapshots available for restoration. This
version history is part of the JSON workspace, not a separate relational model.

## 9. Non-functional goals

- Preserve the existing frontend layout and visual design while completing
  behavior.
- Validate inputs at the client and server boundaries.
- Keep account workspaces isolated, protect state-changing requests, and use
  password hashing and secure production settings.
- Make sync conflicts visible and avoid silently losing newer user changes.
- Treat AI results as editable candidates, not verified facts.
- Keep hosted-provider credentials server-side and out of browser code.
- Explain when AI results are unavailable; AI features never return simulated
  candidates.
- Keep image handling, training provenance, retention, and user consent clear.
- Test business rules and the end-to-end workflows, including error paths and
  small-screen interaction, before making a reliability claim.

## 10. Project deliverable status

The current deliverable is a working prototype with a connected local Django
account/workspace foundation. It is not yet the complete, accuracy-verified
AI-powered system from the original proposal. In particular, the presence of
UI controls does not by itself prove a feature is correct, persistent, or
connected to a real AI model. See [update.md](./update.md) for the detailed
comparison.
