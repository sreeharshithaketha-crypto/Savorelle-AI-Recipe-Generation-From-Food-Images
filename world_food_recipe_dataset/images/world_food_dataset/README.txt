WORLD FOOD IMAGE STARTER DATASET

Contents:
- global_dish_tiles/: 48 crops from a generated international-food collage.
- starter_dishes/: 20 starter dish images, if included.

IMPORTANT:
These are synthetic/generated starter images for prototyping and UI testing. The 48 collage crops are small and their dish identities are NOT verified labels. Do not treat the filenames as ground-truth class labels or rely on this small set alone to train a production model. For ingredient detection, collect varied images of individual raw ingredients and label them with verified ingredient names and bounding boxes/masks. For dish classification, label each image with a verified dish class. Split by original source before train/validation/test to avoid near-duplicate leakage.
