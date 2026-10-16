WORLD FOOD + RECIPE STARTER DATASET

Contents
- recipes.csv: 50 starter recipe records with recipe name, cuisine, dietary label, ingredients, instructions, and prep/cook time.
- recipes.json: same recipe records with ingredients and instructions stored as arrays.
- world_food_diverse_starter_dataset.zip: earlier diverse food-image starter collection.
- images/: extracted contents of the earlier image collection, when extraction was possible.

IMPORTANT LIMITATIONS
1. Recipes are illustrative starter examples, manually authored for project prototyping. Verify quantities, food safety, and cultural authenticity before public release.
2. The food images are generated/cropped starter visuals. Collage crops may contain multiple foods and have NOT been verified as correct labels.
3. Do not train ingredient detection by treating a dish image as if it were a verified list of its visible ingredients.
4. For computer-vision training, create a separate image manifest with one image per row and manually verified labels/bounding boxes. Keep train/validation/test splits separate.
5. CSV fields 'ingredients' and 'instructions' use semicolon and pipe separators respectively. JSON is easier to parse in Python.

Suggested VS Code extension:
- Rainbow CSV (CSV column highlighting and table-like navigation)
- For JSON, use built-in JSON support or JSON Viewer if you prefer a tree view.
