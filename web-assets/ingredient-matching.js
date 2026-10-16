(function (root, factory) {
  const matching = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = matching;
  } else {
    root.SavorelleIngredientMatching = matching;
  }
})(globalThis, function () {
  const ALIASES = {
    aubergine: "eggplant",
    courgette: "zucchini",
    "garbanzo bean": "chickpea",
    garbanzo: "chickpea",
  };
  const UNITS = {
    g: ["g", "gram", "grams"],
    kg: ["kg", "kilogram", "kilograms"],
    mg: ["mg", "milligram", "milligrams"],
    ml: ["ml", "milliliter", "milliliters", "millilitre", "millilitres"],
    l: ["l", "liter", "liters", "litre", "litres"],
    pc: ["pc", "pcs", "piece", "pieces", "count"],
  };
  const FACTORS = {
    g: 1,
    kg: 1000,
    mg: 0.001,
    ml: 1,
    l: 1000,
    pc: 1,
  };
  const UNIT_INFO = Object.fromEntries(
    Object.entries(UNITS).flatMap(([unit, aliases]) =>
      aliases.map((alias) => [
        alias,
        {
          unit: ["kg", "mg"].includes(unit)
            ? "g"
            : unit === "l"
              ? "ml"
              : unit,
          dimension: ["g", "kg", "mg"].includes(unit)
            ? "mass"
            : ["ml", "l"].includes(unit)
              ? "volume"
              : "count",
          factor: FACTORS[unit],
        },
      ]),
    ),
  );

  function normalizeIngredient(value) {
    let name = String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (name.endsWith("ies") && name.length > 3) {
      name = name.slice(0, -3) + "y";
    } else if (name.endsWith("oes") && name.length > 3) {
      name = name.slice(0, -2);
    } else if (/(ches|shes|xes|zes|sses)$/.test(name)) {
      name = name.slice(0, -2);
    } else if (
      name.endsWith("s") &&
      !/(ss|us|is)$/.test(name) &&
      name.length > 2
    ) {
      name = name.slice(0, -1);
    }
    return ALIASES[name] || name;
  }

  function containsIngredientTerm(name, term) {
    const normalizedName = String(name || "")
        .normalize("NFKC")
        .toLowerCase(),
      normalizedTerm = String(term || "")
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    if (!normalizedTerm) return false;
    const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(^|[^a-z0-9])${escapedTerm}(?:s|es)?(?=$|[^a-z0-9])`,
    ).test(normalizedName);
  }

  function unitInfo(value) {
    const unit = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "");
    return UNIT_INFO[unit] || { unit, dimension: `other:${unit}`, factor: 1 };
  }

  function convertQuantity(quantity, fromUnit, toUnit) {
    const amount = Number(quantity);
    const from = unitInfo(fromUnit);
    const to = unitInfo(toUnit);
    if (
      !Number.isFinite(amount) ||
      !from.unit ||
      from.dimension !== to.dimension
    ) {
      return null;
    }
    return (amount * from.factor) / to.factor;
  }

  function shoppingKey(name, unit) {
    return `${normalizeIngredient(name)}|${unitInfo(unit).unit}`;
  }

  function availableQuantity(items, name, unit) {
    return items.reduce((total, item) => {
      if (normalizeIngredient(item.n) !== normalizeIngredient(name)) {
        return total;
      }
      const quantity = convertQuantity(item.q, item.u, unit);
      return quantity === null ? total : total + quantity;
    }, 0);
  }

  function normalizeShoppingKey(value) {
    const key = String(value);
    const separator = key.lastIndexOf("|");
    if (separator < 0) return key;
    return shoppingKey(key.slice(0, separator), key.slice(separator + 1));
  }

  return Object.freeze({
    availableQuantity,
    containsIngredientTerm,
    convertQuantity,
    normalizeIngredient,
    normalizeShoppingKey,
    shoppingKey,
    unitInfo,
  });
});
