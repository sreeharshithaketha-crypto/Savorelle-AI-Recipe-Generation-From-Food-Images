const assert = require("node:assert/strict");
const test = require("node:test");
const matching = require("./ingredient-matching.js");

test("normalizes plural ingredient names and whitespace", () => {
  assert.equal(matching.normalizeIngredient("  TOMATOES "), "tomato");
  assert.equal(matching.normalizeIngredient("chickpeas"), "chickpea");
  assert.equal(matching.normalizeIngredient("  green onions "), "green onion");
});

test("normalizes common ingredient synonyms", () => {
  assert.equal(matching.normalizeIngredient("garbanzo beans"), "chickpea");
  assert.equal(matching.normalizeIngredient("courgettes"), "zucchini");
  assert.equal(matching.normalizeIngredient("aubergines"), "eggplant");
});

test("matches allergen terms without blocking unrelated ingredient names", () => {
  assert.equal(matching.containsIngredientTerm("egg", "egg"), true);
  assert.equal(matching.containsIngredientTerm("eggs", "egg"), true);
  assert.equal(matching.containsIngredientTerm("eggplant", "egg"), false);
  assert.equal(matching.containsIngredientTerm("bell pepper", "pepper"), true);
  assert.equal(matching.containsIngredientTerm("tree nuts", "tree nut"), true);
});

test("converts compatible mass, volume, and count units", () => {
  assert.equal(matching.convertQuantity(1.5, "kg", "g"), 1500);
  assert.equal(matching.convertQuantity(500, "ml", "l"), 0.5);
  assert.equal(matching.convertQuantity(2, "pieces", "pc"), 2);
});

test("aggregates equivalent inventory quantities in the requested unit", () => {
  assert.equal(
    matching.availableQuantity(
      [
        { n: "chickpeas", q: 250, u: "g" },
        { n: "garbanzo beans", q: 0.5, u: "kg" },
        { n: "chickpea", q: 2, u: "pc" },
      ],
      "chickpea",
      "g",
    ),
    750,
  );
});

test("does not convert incompatible or unknown units", () => {
  assert.equal(matching.convertQuantity(1, "kg", "ml"), null);
  assert.equal(matching.convertQuantity(1, "cup", "ml"), null);
  assert.equal(matching.convertQuantity(2, "box", "box"), 2);
});

test("normalizes existing shopping checklist keys", () => {
  assert.equal(
    matching.normalizeShoppingKey("tomatoes|grams"),
    "tomato|g",
  );
});
