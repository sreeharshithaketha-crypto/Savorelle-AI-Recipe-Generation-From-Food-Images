# SAVORELLE SCAN ADDENDUM (append to the backend prompt, sections 4 and 6)

Source: the 20 starter images (`starter_dishes/`). The images are synthetic and their labels are unverified. The expectations below are a human reading of what each picture shows. Use them as regression fixtures for the scan flow and allergy logic. Never use them to report accuracy.

## A. Union rule (allergy and diet checks on scans)

1. For a scan, the allergy engine runs on the UNION of: ingredients detected in the photo (`source=visible`), ingredients of the matched catalogue recipe (`source=inferred`), and anything the user adds or confirms. A recipe match never removes a visible detection.
2. If the photo shows an ingredient that the matched recipe lacks, add it to the list, apply its allergens, and set `recipe_mismatch=true` with a message: "The photo shows X, which is not in the matched recipe."
3. If a detected ingredient is not in the ontology (for example coconut, chia seeds, a nut that has no row yet), create it flagged for review and treat it as possibly allergenic. The verdict becomes CAUTION at best, never SAFE.
4. Diet checks cannot be verified from a photo when meat or fish could be hidden or ambiguous (sauces, sandwich fillings, stews). Return `diet_verified=false` and show a notice for vegetarian and vegan users instead of a clean pass.
5. Strip caption and overlay text from any image before it goes to a vision model or OCR. Never let text rendered in the image decide the dish.

## B. Ontology additions needed before these cases pass

Add with allergens: walnuts, almonds, cashews, pistachios, hazelnuts, pecans (all tree_nut); coconut (flag for review, treat as tree_nut caution); ham (meat, non-vegetarian). Add without allergens: chia seeds, maple syrup, kiwi, strawberry, mango, pineapple, pear, green beans, asparagus, chives.

## C. Catalogue gaps found

No recipe exists for: Fruit Bowl, Plain (steamed) Rice, Vegetable Stir Fry. Add all three through the admin or the enrichment flow in the same format as R001 to R050 (roles, grams, steps, nutrition). Until then the scan flow must say "not in my catalogue" and fall to generation when the top score is weak, never force the nearest dish.

## D. Fixtures (file, nearest catalogue recipe, what the photo shows beyond it, required behaviour)

| Image | Nearest | Extra or ambiguous in photo | Required behaviour |
|---|---|---|---|
| chana_masala | R010 | cilantro | match R010 |
| chicken_noodle_soup | R016 | herbs | match R016 |
| dal | R008 | cilantro; near-identical to R003 and R044 | show top 3, user confirms; never auto-pick |
| vegetable_soup | R003 | yellow kernels or lentils; near-identical to dal | show top 3, user confirms |
| fried_rice | R001 | yellow pieces that could be egg | egg-allergic user: not SAFE (CAUTION) |
| fruit_bowl | none | strawberry, blueberry, kiwi, mango or pineapple | not in catalogue; generate |
| grilled_chicken | R005 | broccoli, potato, carrot, lettuce | union adds the sides, `recipe_mismatch=true` |
| oatmeal | R038 | walnuts, chia seeds, banana, blueberries | tree-nut user: not SAFE; verdict ADAPTED or worse, message says "photo shows walnuts, leave them out" |
| pancakes | R004 | banana, blueberries, syrup | match R004, syrup added |
| paneer_butter_masala | R009 | cilantro | match R009; milk user EXCLUDED |
| pasta | R002 / R032 / R050, low margin | grated cheese on top, herb leaf | `uncertain`, ask user; milk user must NOT get SAFE |
| plain_rice | none | herb leaf | not in catalogue until the recipe is added |
| salad | R006 / R031, low margin | white crumbled cheese, red onion, cherry tomatoes | `uncertain`; milk user must NOT get SAFE |
| salmon | R034 | green beans or asparagus, lemon slices | match R034; fish user EXCLUDED |
| sandwich | R041 | pink slices that may be ham or tomato | `diet_verified=false` for vegetarian users |
| scrambled_eggs | R015 | chives | match R015; egg user EXCLUDED |
| smoothie_bowl | R039 | coconut flakes, nuts or seeds, banana, berries | tree-nut user: not SAFE; coconut flagged unknown |
| spaghetti | R002 | red sauce that looks like minced meat | `diet_verified=false`; user confirms |
| vegetable_omelette | R014 | herbs | match R014; egg user EXCLUDED |
| vegetable_stir_fry | none (R040, R001 nearest) | broccoli, peppers, yellow pieces, unknown sauce | not in catalogue; soy and gluten cannot be ruled out, say so |

## E. Tests to add

1. `test_scan_union_oatmeal`: tree-nut profile + oatmeal.jpg fixture never returns SAFE.
2. `test_scan_union_cheese_cases`: milk profile + pasta.jpg and salad.jpg never return SAFE.
3. `test_scan_unknown_ingredient`: a detection of coconut with no ontology row returns CAUTION and creates a review flag.
4. `test_scan_not_in_catalogue`: fruit_bowl, plain_rice and vegetable_stir_fry fixtures trigger the not-in-catalogue path, not a forced match.
5. `test_scan_diet_unverified`: sandwich and spaghetti fixtures return `diet_verified=false` for a vegetarian profile.
6. `test_caption_stripped`: the image passed to any model has the caption region removed.
