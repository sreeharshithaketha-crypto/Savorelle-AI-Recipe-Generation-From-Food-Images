const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const ingredientMatching = window.SavorelleIngredientMatching;
const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    ),
  cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s),
  fq = (q) => +(+q).toFixed(1);
const DN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  DL = {
    vegan: "Vegan",
    veg: "Vegetarian",
    egg: "Contains egg",
    nonveg: "Non-vegetarian",
  };
const RAW = [
  [
    "Chickpea spinach curry",
    30,
    "Easy",
    "vegan",
    410,
    18,
    "chickpeas:300:g,spinach:200:g,tomato:3:pc,onion:1:pc",
    "Rinse the chickpeas.|Chop the onion and tomatoes.",
    "Fry onion until soft.|Add tomato and spices, cook 8 minutes.|Add chickpeas and spinach, simmer 10 minutes.",
  ],
  [
    "Egg fried rice",
    20,
    "Easy",
    "egg",
    520,
    21,
    "rice:300:g,egg:3:pc,onion:1:pc,soy sauce:20:ml",
    "Use cooled cooked rice.|Slice the onion and beat the eggs.",
    "Scramble eggs and set aside.|Fry onion, add rice on high heat.|Return eggs, add soy sauce, toss 2 minutes.",
  ],
  [
    "Garlic tomato pasta",
    25,
    "Easy",
    "vegan",
    480,
    14,
    "pasta:200:g,tomato:4:pc,garlic:3:pc,onion:1:pc",
    "Crush the garlic.|Chop tomatoes and onion.",
    "Boil pasta until just tender.|Cook garlic, onion and tomato into a sauce, 12 minutes.|Toss pasta through the sauce.",
  ],
  [
    "Home style chicken curry",
    45,
    "Medium",
    "nonveg",
    560,
    42,
    "chicken:500:g,onion:2:pc,tomato:3:pc,yogurt:100:g",
    "Marinate chicken in yogurt for 15 minutes.|Slice onions and puree tomatoes.",
    "Brown onions slowly.|Add tomato and spices, cook until oil separates.|Add chicken, cover and cook 25 minutes.",
  ],
  [
    "Paneer bhurji",
    20,
    "Easy",
    "veg",
    430,
    26,
    "paneer:250:g,onion:1:pc,tomato:2:pc",
    "Crumble the paneer.|Chop onion and tomato finely.",
    "Fry onion until golden.|Add tomato and spices, cook 5 minutes.|Fold in paneer, cook 4 minutes.",
  ],
  [
    "Vegetable pulao",
    35,
    "Medium",
    "vegan",
    450,
    11,
    "rice:250:g,carrot:2:pc,onion:1:pc,peas:100:g",
    "Rinse and soak the rice for 20 minutes.|Dice the carrots and slice the onion.",
    "Fry onion with whole spices.|Add vegetables and rice, stir 2 minutes.|Add water, cover and cook 15 minutes.",
  ],
  [
    "Spinach omelette",
    12,
    "Easy",
    "egg",
    300,
    22,
    "egg:4:pc,spinach:80:g,onion:1:pc",
    "Beat the eggs with salt.|Chop spinach and onion.",
    "Soften onion and spinach in a pan.|Pour in eggs, cook on low until set.|Fold and serve.",
  ],
  [
    "Lentil dal",
    35,
    "Easy",
    "vegan",
    380,
    20,
    "lentils:200:g,tomato:2:pc,onion:1:pc,garlic:2:pc",
    "Rinse lentils until the water runs clear.|Chop onion, tomato and garlic.",
    "Boil lentils until soft, 20 minutes.|Fry garlic, onion and tomato for the tempering.|Pour the tempering over the dal and simmer 5 minutes.",
  ],
];
const R = RAW.map((a, i) => ({
  id: i + 1,
  name: a[0],
  time: a[1],
  diff: a[2],
  diet: a[3],
  kcal: a[4],
  pro: a[5],
  ing: a[6].split(",").map((x) => {
    const [n, q, u] = x.split(":");
    return { n, q: +q, u };
  }),
  prep: a[7].split("|"),
  cook: a[8].split("|"),
}));
const MAX_CUSTOM_RECIPES = 100;
const MAX_RECIPE_VERSIONS = 10;
const S = {
  inv: [
    { n: "rice", q: 500, u: "g" },
    { n: "onion", q: 4, u: "pc" },
    { n: "tomato", q: 3, u: "pc" },
    { n: "egg", q: 6, u: "pc" },
    { n: "spinach", q: 150, u: "g" },
    { n: "chickpeas", q: 200, u: "g" },
  ],
  fav: new Set(),
  hist: [],
  plan: {},
  bought: new Set(),
  det: [],
  f: { diet: "Any", time: 0, diff: "Any" },
  cur: "home",
  tab: "fav",
  open: 0,
  sv: 2,
  notes: {},
};
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2200);
}
const MODS = [
  [
    "scan",
    "Scan food",
    "Build your ingredient list.",
    "Enter ingredients with their quantities, review the list, then confirm items to add them to your inventory.",
  ],
  [
    "pantry",
    "Inventory",
    "Quantities you hold.",
    "Maintain every ingredient with a name, quantity and unit. Matching, planning and shopping all read from this list.",
  ],
  [
    "recipes",
    "Recipes",
    "Ranked suggestions.",
    "Create a recipe from ingredients you have entered, with your allergies applied. Browse ranked suggestions filtered by diet, time and difficulty, with scaled quantities, steps and nutrition.",
  ],
  [
    "lib",
    "Saved and history",
    "Revisit recipes.",
    "Save favourites and return to anything you opened recently.",
  ],
  [
    "plan",
    "Meal planner",
    "Your week at a glance.",
    "Assign recipes to a day and meal across the week.",
  ],
  [
    "shop",
    "Shopping list",
    "Only what is missing.",
    "Scheduled recipes are compared with inventory and only missing quantities are listed. Mark items bought to update stock.",
  ],
  [
    "imp",
    "YouTube import",
    "Video to recipe.",
    "Paste a cooking video link and add its ingredients and steps to your own recipe list.",
  ],
];
const ALG = {
  gluten: ["pasta", "bread", "noodles", "flour", "roti", "wheat"],
  dairy: ["yogurt", "paneer", "milk", "butter", "cheese", "ghee", "cream"],
  egg: ["egg"],
  peanuts: ["peanut"],
  "tree nuts": ["almond", "cashew", "walnut", "pistachio"],
  soy: ["soy", "tofu"],
  fish: ["fish"],
  shellfish: ["prawn", "shrimp", "crab"],
  sesame: ["sesame"],
  mustard: ["mustard"],
  legumes: ["chickpea", "lentil", "peas", "bean"],
};
S.alg = new Set();
S.av = [];
S.cdet = [];
let demoRecipes = null;
let demoRecipesRequest = null;
let demoQuery = "";
const hit = (a, n) =>
    ALG[a].some((term) =>
      ingredientMatching.containsIngredientTerm(n, term),
    ),
  bad = (n) =>
    Object.keys(ALG).some((a) => S.alg.has(a) && hit(a, n)) ||
    S.av.some((v) =>
      ingredientMatching.containsIngredientTerm(n, v),
    ),
  NV = ["chicken", "fish", "prawn", "shrimp", "mutton", "beef", "pork"],
  VG = ["egg", "paneer", "yogurt", "milk", "butter", "cheese", "ghee", "cream"],
  dietOk = (n) =>
    S.f.diet == "Vegan"
      ? ![...NV, ...VG].some((k) => n.includes(k))
      : S.f.diet == "Vegetarian"
        ? !NV.some((k) => n.includes(k))
        : true;
const allAlg = (r) =>
    Object.keys(ALG).filter((a) => r.ing.some((i) => hit(a, i.n))),
  algOf = (r) =>
    allAlg(r)
      .filter((a) => S.alg.has(a))
      .concat(
        r.ing.filter((i) => S.av.some((v) => i.n.includes(v))).map((i) => i.n),
      );
const LEG = {
  priv: [
    "Privacy policy",
    "Last updated 15 October 2026",
    [
      [
        "Who we are",
        "Savorelle is an internship project built at Anurag IT Solutions Pvt. Ltd. This prototype is for demonstration and evaluation.",
      ],
      [
        "What we handle",
        "Account name, username and email; ingredient names and quantities; diet and allergy settings; saved recipes, meal plans, preferences and recipe notes.",
      ],
      [
        "How it is used",
        "Account workspaces are saved in the Savorelle database so they can be restored when you sign in. Guest workspaces are saved in this browser.",
      ],
      [
        "Images",
        "An image selected for scanning is sent to the backend for analysis and is not retained by this application. Photo analysis requires an OpenAI API key on the server; without one, scanning is unavailable and no suggestions are generated.",
      ],
      [
        "Allergy settings",
        "Allergy and avoid settings filter recipe suggestions and are included with photo analysis to withhold matching ingredient candidates. They are not medical records and do not guarantee food safety.",
      ],
      [
        "Account details",
        "Account names, usernames and email addresses are stored with the account. Passwords are stored as one-way hashes, not as plain text. The site uses a session cookie to keep you signed in.",
      ],
      [
        "Retention",
        "Account workspaces remain in the configured database until deleted by the site operator. Guest data remains in browser storage until cleared.",
      ],
      [
        "Your choices",
        "You can remove any ingredient, saved recipe or plan entry at any time.",
      ],
      [
        "Contact",
        "Questions can be sent to the project team at Anurag IT Solutions Pvt. Ltd.",
      ],
    ],
  ],
  terms: [
    "Terms of use",
    "Last updated 15 October 2026",
    [
      [
        "Purpose and acceptance",
        "Savorelle is a demonstration prototype. By using it you accept these terms.",
      ],
      [
        "Permitted use",
        "Use the prototype for personal meal planning and project evaluation.",
      ],
      [
        "AI limitations",
        "Ingredient detection and recipe generation can be wrong. Review every result before cooking.",
      ],
      [
        "Recipes and nutrition",
        "Quantities, timings and nutrition values are estimates.",
      ],
      [
        "Allergens",
        "Allergy filtering matches ingredient names only and does not guarantee a recipe is safe. Check labels and seek medical advice where needed.",
      ],
      [
        "Third party content",
        "YouTube content belongs to its owners. Imports reference public links only.",
      ],
      [
        "Limitation of liability",
        "The project team is not liable for harm arising from use of sample recipes or AI output.",
      ],
      ["Changes", "These terms may change as the project develops."],
    ],
  ],
};
function leg(k) {
  const L = LEG[k];
  $("#" + k).innerHTML =
    `<div class="up n">Legal</div><h2>${L[0]}</h2><p class="mu">${L[1]}</p><div class="pn">${L[2].map((s, i) => `<div class="st" style="${i ? "" : "border-top:0"}"><b class="w n">${i + 1}</b><span><span class="gr">${s[0]}</span><br><span class="mu">${s[1]}</span></span></div>`).join("")}</div><div style="margin-top:20px"><button class="b" onclick="go('${k == "priv" ? "terms" : "priv"}')">${k == "priv" ? "Read terms of use" : "Read privacy policy"}</button></div>`;
}
const sk = (n) => '<div class="sk"></div>'.repeat(n);
function have(n, u) {
  return ingredientMatching.availableQuantity(S.inv, n, u);
}
function stat(r, k = 1) {
  let h = 0,
    miss = [];
  r.ing.forEach((i) => {
    const need = i.q * k,
      hv = have(i.n, i.u);
    if (hv >= need) h++;
    else miss.push({ n: i.n, u: i.u, q: need - hv });
  });
  return {
    t: r.ing.length,
    h,
    miss,
    pct: Math.round((h / r.ing.length) * 100),
  };
}
function shopList() {
  const need = {};
  Object.values(S.plan).forEach((id) => {
    const recipe = R.find((x) => x.id == id);
    if (!recipe) return;
    recipe.ing.forEach((i) => {
      const unit = ingredientMatching.unitInfo(i.u);
      const k = ingredientMatching.shoppingKey(i.n, unit.unit);
      const quantity = ingredientMatching.convertQuantity(i.q, i.u, unit.unit);
      if (quantity === null) return;
      need[k] = (need[k] || 0) + quantity;
    });
  });
  return Object.entries(need)
    .map(([k, required]) => {
      const [n, u] = k.split("|");
      return {
        n,
        u,
        k,
        q: required - have(n, u),
      };
    })
    .filter((x) => x.q > 0);
}
function go(id) {
  S.cur = id;
  $$(".v").forEach((v) => (v.hidden = v.id != id));
  $$(".nv").forEach((b) =>
    b.classList.toggle("on", !b.dataset.section && b.dataset.v == id),
  );
  scrollTo(0, 0);
  draw();
}
function draw(persist = true) {
  V[S.cur]();
  if (persist) scheduleSave();
}
$$(".nv").forEach(
  (b) =>
    (b.onclick = () => {
      go(b.dataset.v);
      if (b.dataset.section) {
        b.classList.add("on");
        requestAnimationFrame(() =>
          document.getElementById(b.dataset.section).scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        );
      }
    }),
);
function renderSampleRecipes() {
  const status = $("#sample-status"),
    container = $("#sample-recipes");
  if (!demoRecipes) {
    status.textContent = demoRecipesRequest
      ? "Loading sample recipes..."
      : "";
    return;
  }
  const query = demoQuery.trim().toLowerCase(),
    visible = demoRecipes.filter((recipe) =>
      [
        recipe.recipe_name,
        recipe.cuisine,
        recipe.diet_type,
        ...recipe.ingredients,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  status.textContent = `Showing ${visible.length} of ${demoRecipes.length} sample recipes.`;
  container.innerHTML = visible.length
    ? visible
        .map(
          (recipe) =>
            `<details class="st"><summary class="gr">${esc(recipe.recipe_name)} · ${esc(recipe.cuisine)}</summary><p class="mu sm2">${esc(recipe.diet_type)} · ${recipe.prep_time_min} min prep · ${recipe.cook_time_min} min cook</p><p class="mu sm2"><b>Ingredients:</b> ${recipe.ingredients.map(esc).join(", ")}</p><ol>${recipe.instructions.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></details>`,
        )
        .join("")
    : '<p class="mu">No sample recipes match your search.</p>';
}
function loadSampleRecipes() {
  if (demoRecipes || demoRecipesRequest) {
    renderSampleRecipes();
    return;
  }
  demoRecipesRequest = api("/demo-recipes/")
    .then((recipes) => {
      if (
        !Array.isArray(recipes) ||
        recipes.some(
          (recipe) =>
            !recipe ||
            typeof recipe.recipe_name !== "string" ||
            typeof recipe.cuisine !== "string" ||
            !Array.isArray(recipe.ingredients) ||
            !Array.isArray(recipe.instructions),
        )
      ) {
        throw new Error("The sample recipe catalogue has an invalid format.");
      }
      demoRecipes = recipes;
      demoRecipesRequest = null;
      renderSampleRecipes();
    })
    .catch((error) => {
      demoRecipesRequest = null;
      $("#sample-status").textContent =
        "Sample recipes could not be loaded: " + error.message;
    });
}
function filterSampleRecipes(query) {
  demoQuery = query;
  renderSampleRecipes();
}
const V = {
  home() {
    $("#mods").innerHTML = MODS.map(
      (m) =>
        `<div class="rw"><span class="w n" style="width:34px">${String(MODS.indexOf(m) + 1).padStart(2, "0")}</span><span style="flex:1"><span class="gr">${m[1]}</span><br><span class="mu">${m[3]}</span></span><button class="b sm" onclick="go('${m[0]}')">Open</button></div>`,
    ).join("");
    $(".live").innerHTML = [
      ["Ingredients in inventory", S.inv.length],
      ["Saved recipes", S.fav.size],
      ["Meals planned", Object.keys(S.plan).length],
      ["Items to buy", shopList().length],
    ]
      .map(
        ([a, b]) =>
          `<div class="rw"><span class="mu" style="flex:1">${a}</span><b class="w n" style="font-size:28px">${b}</b></div>`,
      )
      .join("");
  },
  scan() {
    V.alg();
    const d = S.det;
    $("#det").innerHTML = d.length
      ? d
          .map(
            (x, i) =>
              `<div class="rw"><span class="gr" style="flex:1">${esc(cap(x.n))}</span><span class="tg">${x.c ? x.c + "% sure" : "manual"}</span><input type="number" min="0" value="${x.q}" onchange="S.det[${i}].q=+this.value" style="width:80px"><span class="mu" style="width:22px">${x.u}</span><button class="b sm" onclick="S.det.splice(${i},1);draw()">Remove</button></div>`,
          )
          .join("")
      : '<p class="mu">No ingredients yet. Take a photo or add an ingredient and quantity to get started.</p>';
    $("#cf").disabled = !d.length;
  },
  pantry() {
    $("#inv").innerHTML = S.inv.length
      ? S.inv
          .map(
            (x, i) =>
              `<div class="rw"><input type="text" value="${esc(x.n)}" onchange="setInvName(${i},this.value)" style="flex:1;min-width:120px"><button class="b sm" onclick="adj(${i},-1)">-</button><input type="number" min="0" max="1000000" value="${x.q}" onchange="setInvQuantity(${i},this.value)" style="width:84px"><button class="b sm" onclick="adj(${i},1)">+</button><span class="mu" style="width:22px">${x.u}</span><button class="b sm" onclick="S.inv.splice(${i},1);draw()">Remove</button></div>`,
          )
          .join("")
      : '<p class="mu">Inventory is empty. Add items above or use Scan food to enter them.</p>';
  },
  recipes() {
    V.alg();
    V.cr();
    loadSampleRecipes();
    const f = S.f,
      L = R.filter(
        (r) =>
          !algOf(r).length &&
          (f.diet == "Any" ||
            (f.diet == "Vegan" && r.diet == "vegan") ||
            (f.diet == "Vegetarian" && ["vegan", "veg"].includes(r.diet)) ||
            (f.diet == "Non-vegetarian" &&
              ["egg", "nonveg"].includes(r.diet)) ||
            (f.diet == "High protein" && r.pro >= 20)) &&
          (!f.time || r.time <= f.time) &&
          (f.diff == "Any" || r.diff == f.diff),
      )
        .map((r) => ({ r, s: stat(r) }))
        .sort((a, b) => b.s.pct - a.s.pct || a.r.time - b.r.time);
    $("#rl").innerHTML = L.length
      ? L.map(
          ({ r, s }, i) =>
            `<div class="rw rc" onclick="show(${r.id})"><span class="w n" style="width:30px">${String(i + 1).padStart(2, "0")}</span><div style="flex:1"><div class="gr">${esc(r.name)} ${r.src ? '<span class="tg">imported</span>' : ""}${r.gen ? '<span class="tg">generated</span>' : ""}</div><div class="mu sm2">${r.time} min · ${r.diff} · ${DL[r.diet]} · ${r.kcal} kcal per serving</div></div><div class="mt"><div class="bar"><i style="width:${s.pct}%"></i></div><span class="mu sm2">${s.h} of ${s.t} in stock</span></div></div>`,
        ).join("")
      : '<p class="mu" style="margin-top:14px">No recipes match these preferences.</p>';
    const restrictedRecipes = R.map((recipe) => ({
      recipe,
      triggers: algOf(recipe),
    })).filter((item) => item.triggers.length);
    $("#am").innerHTML = restrictedRecipes.length
      ? `<div role="status"><b>${restrictedRecipes.length} recipes are not recommended for your allergy or avoid settings:</b><ul>${restrictedRecipes
          .map(
            ({ recipe, triggers }) =>
              `<li>${esc(recipe.name)} — matched: ${triggers.map(esc).join(", ")}</li>`,
          )
          .join("")}</ul><span class="mu sm2">These matches are name-based and cannot guarantee food safety. Check ingredient labels.</span></div>`
      : "";
  },
  lib() {
    $("#t1").classList.toggle("on", S.tab == "fav");
    $("#t2").classList.toggle("on", S.tab == "his");
    const L = S.tab == "fav" ? [...S.fav].map((id) => ({ id })) : S.hist;
    $("#lt").innerHTML = L.length
      ? L.map((h) => {
          const r = R.find((x) => x.id == h.id);
          return `<div class="rw"><span class="gr" style="flex:1">${esc(r.name)}</span><span class="mu sm2">${h.t || r.time + " min"}</span><button class="b sm" onclick="show(${r.id})">Open</button>${S.tab == "fav" ? `<button class="b sm" onclick="S.fav.delete(${r.id});draw()">Remove</button>` : ""}</div>`;
        }).join("")
      : `<p class="mu">${S.tab == "fav" ? "No saved recipes yet. Open a recipe and save it." : "No history yet. Recipes you open appear here."}</p>`;
  },
  plan() {
    $("#ks").textContent = "Strict limit: " + (S.kc.strict ? "On" : "Off");
    $("#pg").innerHTML = DN.map(
      (d) =>
        `<div class="dy"><div class="up n">${d}</div><div class="bar" style="width:100%"><i style="width:${Math.min(100, (planDay(d) / S.kc.t) * 100)}%;background:${planDay(d) > S.kc.t ? "var(--c)" : "var(--s)"}"></i></div><div class="mu sm2">${planDay(d)} / ${S.kc.t} kcal</div>${["Breakfast", "Lunch", "Snack", "Dinner"].map((m) => `<label class="mu sm2">${m}<select onchange="setP('${d}-${m}',this.value)"><option value="">Not planned</option>${R.map((r) => `<option value="${r.id}"${S.plan[d + "-" + m] == r.id ? " selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>`).join("")}</div>`,
    ).join("");
  },
  shop() {
    const L = shopList(),
      np = Object.keys(S.plan).length;
    $("#ss").textContent = np
      ? `${np} planned meals checked against inventory. ${L.length} item${L.length == 1 ? "" : "s"} missing.`
      : "No meals planned yet.";
    $("#sl").innerHTML = !np
      ? '<p class="mu">Add recipes in the meal planner first.</p>'
      : L.length
        ? L.map(
            (x) =>
              `<div class="rw"><span class="gr" style="flex:1">${esc(cap(x.n))}</span><span class="mu">${fq(x.q)} ${x.u}</span><button class="b sm${S.bought.has(x.k) ? " p" : ""}" onclick="bt('${x.k}')">${S.bought.has(x.k) ? "Bought" : "Mark bought"}</button></div>`,
          ).join("")
        : '<p class="mu">Your inventory covers every planned meal.</p>';
  },
  imp() {},
  login() {
    $("#l1").classList.toggle("on", S.lm == "in");
    $("#l2").classList.toggle("on", S.lm == "up");
    $("#lnm").hidden = S.lm == "in";
    $("#lcp").hidden = S.lm == "in";
    $("#lel").textContent = S.lm == "in" ? "Email or username" : "Email";
    $("#lck").hidden = S.lm == "in";
    $("#lgo").textContent = S.lm == "in" ? "Sign in" : "Create account";
    $("#lerr").textContent = "";
  },
  cr() {
    $("#cl").innerHTML = S.cdet.length
      ? S.cdet
          .map(
            (x, i) =>
              `<div class="rw"><span class="gr" style="flex:1">${esc(cap(x.n))}</span>${bad(x.n) ? '<span class="tg" style="color:var(--c);border-color:var(--c)">avoided</span>' : x.c ? '<span class="tg">' + x.c + "% sure</span>" : ""}<input type="number" min="0" value="${x.q}" onchange="S.cdet[${i}].q=+this.value" style="width:80px"><span class="mu" style="width:22px">${x.u}</span><button class="b sm" onclick="S.cdet.splice(${i},1);draw()">Remove</button></div>`,
          )
          .join("")
      : '<p class="mu sm2">No ingredients yet. Add items above or use your inventory.</p>';
  },
  alg() {
    const H =
      Object.keys(ALG)
        .map(
          (a) =>
            `<button class="b${S.alg.has(a) ? " p" : ""}" onclick="S.alg.has('${a}')?S.alg.delete('${a}'):S.alg.add('${a}');draw()">${cap(a)}</button>`,
        )
        .join("") +
      S.av
        .map(
          (v, i) =>
            `<button class="b p" onclick="S.av.splice(${i},1);draw()">${esc(cap(v))} (remove)</button>`,
        )
        .join("");
    $$(".al").forEach((e) => (e.innerHTML = H));
  },
  svc() {
    $("#sv").innerHTML = MODS.map(
      (m, i) =>
        `<div class="rw" style="align-items:flex-start"><span class="w n" style="width:34px">${String(i + 1).padStart(2, "0")}</span><div style="flex:1"><div class="gr">${m[1]}</div><div class="mu">${m[3]}</div></div><button class="b sm" onclick="go('${m[0]}')">Open</button></div>`,
    ).join("");
  },
  priv() {
    leg("priv");
  },
  terms() {
    leg("terms");
  },
};
function planDay(d) {
  return ["Breakfast", "Lunch", "Snack", "Dinner"].reduce((a, m) => {
    const id = S.plan[d + "-" + m];
    const recipe = R.find((x) => x.id == id);
    return a + (recipe ? recipe.kcal : 0);
  }, 0);
}
function setP(k, v) {
  if (v) {
    const d = k.split("-")[0],
      r = R.find((x) => x.id == +v),
      cur = S.plan[k] ? R.find((x) => x.id == S.plan[k]).kcal : 0;
    if (S.kc.strict && planDay(d) - cur + r.kcal > S.kc.t) {
      toast("Over your " + S.kc.t + " kcal limit for " + d);
      draw();
      return;
    }
    S.plan[k] = +v;
  } else delete S.plan[k];
  toast("Plan updated");
  draw();
}
function addP() {
  const d = $("#pd").value,
    k = d + "-" + $("#pm").value,
    r = R.find((x) => x.id == S.open),
    cur = S.plan[k] ? R.find((x) => x.id == S.plan[k]).kcal : 0;
  if (S.kc.strict && planDay(d) - cur + r.kcal > S.kc.t)
    return toast("Over your " + S.kc.t + " kcal limit for " + d);
  S.plan[k] = S.open;
  toast("Added to planner");
  scheduleSave();
}
function autoPlan() {
  const M = ["Breakfast", "Lunch", "Snack", "Dinner"],
    SH = [0.25, 0.35, 0.1, 0.3],
    ok = R.filter((r) => !algOf(r).length && r.ing.every((i) => dietOk(i.n)));
  if (!ok.length) return toast("No recipes fit your allergies and diet");
  const mn = Math.min(...ok.map((r) => r.kcal));
  S.plan = {};
  let n = 0;
  DN.forEach((d, di) => {
    let left = S.kc.t;
    M.forEach((m, i) => {
      const lim = S.kc.strict ? left - mn * (M.length - 1 - i) : 1e9,
        c = ok.filter((r) => r.kcal <= lim);
      if (!c.length) return;
      const g = S.kc.t * SH[i];
      c.sort((a, b) => Math.abs(a.kcal - g) - Math.abs(b.kcal - g));
      const p = c[(di + i) % Math.min(2, c.length)];
      S.plan[d + "-" + m] = p.id;
      left -= p.kcal;
      n++;
    });
  });
  toast(n + " meals planned");
  draw();
}
function bt(k) {
  S.bought.has(k) ? S.bought.delete(k) : S.bought.add(k);
  draw();
}
function stock() {
  const L = shopList().filter((x) => S.bought.has(x.k));
  if (!L.length) return toast("Mark items as bought first");
  L.forEach((x) => {
    const e = S.inv.find(
      (y) =>
        ingredientMatching.normalizeIngredient(y.n) === x.n &&
        ingredientMatching.convertQuantity(1, x.u, y.u) !== null,
    );
    if (e) {
      e.q += ingredientMatching.convertQuantity(x.q, x.u, e.u);
    } else {
      S.inv.push({ n: x.n, u: x.u, q: x.q });
    }
  });
  S.bought.clear();
  toast("Inventory updated");
  draw();
}
function adj(i, d) {
  const x = S.inv[i];
  const quantity = Math.max(0, x.q + d * (x.u == "pc" ? 1 : 50));
  if (quantity > 1000000) {
    toast("Ingredient quantity cannot exceed 1,000,000");
    return;
  }
  x.q = quantity;
  draw();
}
function addInv() {
  const n = $("#pn").value.trim().toLowerCase(),
    q = +$("#pq").value;
  if (!n || !Number.isFinite(q) || q <= 0 || q > 1000000)
    return toast("Enter an ingredient and a quantity from 0 to 1,000,000");
  const u = $("#pu").value,
    canonicalName = ingredientMatching.normalizeIngredient(n),
    e = S.inv.find(
      (y) =>
        ingredientMatching.normalizeIngredient(y.n) === canonicalName &&
        ingredientMatching.convertQuantity(1, u, y.u) !== null,
    ),
    converted = e ? ingredientMatching.convertQuantity(q, u, e.u) : null;
  if (e && converted !== null) {
    if (e.q + converted > 1000000)
      return toast("Ingredient quantity cannot exceed 1,000,000");
    e.q += converted;
  } else S.inv.push({ n: canonicalName, q, u });
  $("#pn").value = "";
  $("#pq").value = "";
  draw();
}
function setInvName(i, value) {
  const item = S.inv[i],
    name = ingredientMatching.normalizeIngredient(value);
  if (!name) {
    toast("Enter an ingredient name");
    draw();
    return;
  }
  const duplicateIndex = S.inv.findIndex(
    (other, index) =>
      index !== i &&
      ingredientMatching.normalizeIngredient(other.n) === name &&
      ingredientMatching.convertQuantity(1, item.u, other.u) !== null,
  );
  if (duplicateIndex < 0) {
    item.n = name;
  } else {
    const duplicate = S.inv[duplicateIndex],
      quantity = ingredientMatching.convertQuantity(
        item.q,
        item.u,
        duplicate.u,
      );
    if (duplicate.q + quantity > 1000000) {
      toast("Ingredient quantity cannot exceed 1,000,000");
      draw();
      return;
    }
    duplicate.q += quantity;
    S.inv.splice(i, 1);
  }
  draw();
}
function setInvQuantity(i, value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1000000) {
    toast("Enter a quantity from 0 to 1,000,000");
    draw();
    return;
  }
  S.inv[i].q = quantity;
  draw();
}
function addDet() {
  const n = $("#mn").value.trim().toLowerCase(),
    q = +$("#mq").value;
  if (!n || !q) return toast("Enter a name and quantity");
  if (bad(n))
    return toast("That ingredient matches an allergy or food-to-avoid setting");
  S.det.push({ n, q, u: $("#mu").value });
  $("#mn").value = "";
  $("#mq").value = "";
  draw();
}
function conf() {
  const safeIngredients = S.det.filter((ingredient) => !bad(ingredient.n)),
    withheldCount = S.det.length - safeIngredients.length;
  if (!safeIngredients.length) {
    S.det = [];
    draw();
    return toast(
      withheldCount
        ? "All suggestions matched your allergy or avoid settings and were withheld."
        : "Add at least one safe ingredient before confirming.",
    );
  }
  safeIngredients.forEach((x) => {
    const name = ingredientMatching.normalizeIngredient(x.n);
    const e = S.inv.find(
      (y) =>
        ingredientMatching.normalizeIngredient(y.n) === name &&
        ingredientMatching.convertQuantity(1, x.u, y.u) !== null,
    );
    const converted = e
      ? ingredientMatching.convertQuantity(x.q, x.u, e.u)
      : null;
    if (e && converted !== null) e.q += converted;
    else S.inv.push({ n: name, u: x.u, q: x.q });
  });
  S.det = [];
  toast(
    withheldCount
      ? `Added safe ingredients; withheld ${withheldCount} matching your allergy or avoid settings.`
      : "Added to inventory",
  );
  go("recipes");
}
function scanFile(f) {
  if (!f || !f.type.startsWith("image/")) return toast("Choose an image file");
  const r = new FileReader();
  r.onload = () => {
    $("#pv").src = r.result;
    $("#pv").hidden = false;
    $("#fn").textContent = f.name;
    S.det = [];
    $("#cf").disabled = true;
    $("#det").innerHTML = sk(4);
    const form = new FormData();
    form.append("image", f);
    form.append("allergies", JSON.stringify([...S.alg]));
    form.append("avoid", JSON.stringify(S.av));
    api("/scan/", { method: "POST", body: form })
      .then((result) => {
        if (result.is_food !== true) {
          throw new Error(
            "No food detected. Please provide a valid image of food.",
          );
        }
        S.det = result.ingredients.map((item) => ({
          ...item,
          c: Math.round(item.confidence * 100),
        }));
        $("#fn").textContent = result.dish
          ? `${f.name} · Identified dish: ${result.dish}`
          : f.name;
        const notices = [];
        if (result.withheld_count)
          notices.push(
            `${result.withheld_count} suggestion${result.withheld_count == 1 ? "" : "s"} matching your allergy or avoid settings withheld. Photo analysis cannot guarantee allergy safety.`,
          );
        if (notices.length) toast(notices.join(" "));
        draw();
      })
      .catch((error) => {
        if (error.status) {
          S.det = [];
          draw();
          toast(error.message);
          return;
        }
        S.det = [];
        draw();
        toast("Could not reach the scan service. Check your connection and try again.");
      });
  };
  r.onerror = () => toast("Could not read the selected image");
  r.readAsDataURL(f);
}
$("#file").onchange = (e) => {
  scanFile(e.target.files[0]);
};
const scanDrop = $("#scan-drop");
scanDrop.addEventListener("dragenter", (e) => {
  e.preventDefault();
  scanDrop.classList.add("drag-over");
});
scanDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
});
scanDrop.addEventListener("dragleave", (e) => {
  if (!scanDrop.contains(e.relatedTarget))
    scanDrop.classList.remove("drag-over");
});
scanDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  scanDrop.classList.remove("drag-over");
  scanFile(e.dataTransfer.files[0]);
});
S.kc = { t: 2000, strict: true };
S.lm = "in";
S.u = null;
async function auth() {
  const e = $("#le").value.trim(),
    p = $("#lpw").value,
    n = $("#ln").value.trim(),
    u = $("#lu").value.trim(),
    er = $("#lerr"),
    up = S.lm == "up",
    fail = (m) => {
      er.textContent = m;
    };
  if (up) {
    if (!n) return fail("Enter your name.");
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u))
      return fail("Username must be 3 to 20 letters, numbers or underscores.");
  } else if (!e) return fail("Enter your email or username.");
  if (up && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return fail("Enter a valid email address.");
  if (p.length < 8) return fail("Password must be at least 8 characters.");
  if (up) {
    if (p !== $("#lpc").value) return fail("Passwords do not match.");
    if (!$("#lc").checked)
      return fail("Accept the terms and privacy policy to continue.");
  }
  er.textContent = "";
  try {
    if (!S.u) localStorage.setItem(GUEST_KEY, JSON.stringify(workspaceData()));
    const session = up
      ? await api("/auth/register/", {
          method: "POST",
          body: JSON.stringify({
            name: n,
            username: u,
            email: e,
            password: p,
            acceptedTerms: $("#lc").checked,
          }),
        })
      : await api("/auth/login/", {
          method: "POST",
          body: JSON.stringify({ identifier: e, password: p }),
        });
    S.u = session.user.username;
    $("#si").textContent = "Sign out (" + S.u + ")";
    const workspace = await api("/workspace/");
    serverRevision = workspace.revision;
    if (workspace.revision > 0) applyWorkspace(workspace.data);
    else await syncWorkspace();
    cloudReady = true;
    $("#lpw").value = "";
    $("#lpc").value = "";
    toast("Signed in as " + S.u);
    go("home");
  } catch (error) {
    er.textContent = error.message;
  }
}
function auth0() {
  const e = $("#le").value.trim(),
    p = $("#lpw").value,
    n = $("#ln").value.trim(),
    er = $("#lerr");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    er.textContent = "Enter a valid email address.";
    return;
  }
  if (p.length < 8) {
    er.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (S.lm == "up") {
    if (!n) {
      er.textContent = "Enter your name.";
      return;
    }
    if (!$("#lc").checked) {
      er.textContent = "Accept the terms and privacy policy to continue.";
      return;
    }
  }
  S.u = S.lm == "up" ? n : e.split("@")[0];
  $("#lpw").value = "";
  $("#si").textContent = "Sign out (" + S.u + ")";
  toast("Signed in as " + S.u);
  go("home");
}
async function out() {
  try {
    await api("/auth/logout/", { method: "POST" });
    S.u = null;
    cloudReady = false;
    serverRevision = 0;
    $("#si").textContent = "Sign in";
    const guest = localStorage.getItem(GUEST_KEY);
    if (guest) applyWorkspace(JSON.parse(guest));
    toast("Signed out");
    go("home");
  } catch (error) {
    toast("Could not sign out: " + error.message);
  }
}
function pal(t) {
  document.documentElement.dataset.t = t;
  $$(".pal .b").forEach((b) => b.classList.toggle("on", b.dataset.t == t));
}
const API = "/api",
  GUEST_KEY = "savorelle.guest.v1";
let serverRevision = 0,
  cloudReady = false,
  syncTimer = 0;
function workspaceData() {
  return {
    inventory: S.inv,
    favorites: [...S.fav],
    history: S.hist,
    plan: S.plan,
    bought: [...S.bought],
    allergies: [...S.alg],
    avoid: S.av,
    preferences: S.f,
    calories: S.kc,
    notes: S.notes,
    customRecipes: R.filter((recipe) => recipe.id > 8),
  };
}
function applyWorkspace(data) {
  S.inv = data.inventory || [];
  S.fav = new Set(data.favorites || []);
  S.hist = data.history || [];
  S.plan = data.plan || {};
  S.bought = new Set(
    (data.bought || []).map(ingredientMatching.normalizeShoppingKey),
  );
  S.alg = new Set(data.allergies || []);
  S.av = data.avoid || [];
  S.f = data.preferences || { diet: "Any", time: 0, diff: "Any" };
  S.kc = data.calories || { t: 2000, strict: true };
  S.notes = data.notes || {};
  const customRecipes = (data.customRecipes || []).map((recipe) => ({
    ...recipe,
    gen: Boolean(recipe.gen),
    versions: Array.isArray(recipe.versions) ? recipe.versions : [],
  }));
  R.splice(8, R.length - 8, ...customRecipes);
  const recipeIds = new Set(R.map((recipe) => recipe.id));
  S.fav = new Set([...S.fav].filter((id) => recipeIds.has(id)));
  S.hist = S.hist.filter((entry) => recipeIds.has(entry.id));
  S.plan = Object.fromEntries(
    Object.entries(S.plan).filter(([, id]) => recipeIds.has(id)),
  );
}
function saveGuestState() {
  if (S.u) return;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(workspaceData()));
  } catch {
    toast("Could not save local changes in this browser.");
  }
}
function cookie(name) {
  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(name + "="));
  return value ? decodeURIComponent(value.split("=").slice(1).join("=")) : "";
}
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.method && options.method !== "GET") {
    headers.set("X-CSRFToken", cookie("csrftoken"));
  }
  const response = await fetch(API + path, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      `The server returned an invalid response (${response.status}).`,
    );
  }
  if (!response.ok) {
    const error = new Error(
      body.error || `Request failed (${response.status}).`,
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
async function syncWorkspace() {
  if (!S.u || !cloudReady) return;
  try {
    const result = await api("/workspace/", {
      method: "PUT",
      body: JSON.stringify({ revision: serverRevision, data: workspaceData() }),
    });
    serverRevision = result.revision;
  } catch (error) {
    if (error.status === 409 && error.body.data) {
      serverRevision = error.body.revision;
      applyWorkspace(error.body.data);
      draw();
      toast(
        "Workspace changed on another device; the latest version was loaded.",
      );
      return;
    }
    toast("Could not sync account changes: " + error.message);
  }
}
function scheduleSave() {
  saveGuestState();
  if (!S.u || !cloudReady) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncWorkspace, 450);
}
async function startApp() {
  const saved = localStorage.getItem(GUEST_KEY);
  if (saved) {
    try {
      applyWorkspace(JSON.parse(saved));
    } catch {
      toast(
        "Saved local data could not be read; starting with a fresh workspace.",
      );
    }
  }
  draw(false);
  try {
    const session = await api("/auth/me/");
    if (session.authenticated) {
      S.u = session.user.username;
      $("#si").textContent = "Sign out (" + S.u + ")";
      const workspace = await api("/workspace/");
      serverRevision = workspace.revision;
      if (workspace.revision > 0) applyWorkspace(workspace.data);
      else await syncWorkspace();
    }
  } catch (error) {
    toast(
      "Account sync is unavailable; changes will stay on this device for now.",
    );
  }
  cloudReady = true;
  draw();
}
function addC() {
  const n = $("#cn").value.trim().toLowerCase(),
    q = +$("#cq").value;
  if (!n || !q) return toast("Enter a name and quantity");
  S.cdet.push({ n, q, u: $("#cu").value });
  $("#cn").value = "";
  $("#cq").value = "";
  draw();
}
function addAv(inputId = "av") {
  const input = $("#" + inputId);
  const v = input.value.trim().toLowerCase();
  if (!v) return;
  if (!S.av.includes(v)) S.av.push(v);
  input.value = "";
  draw();
}
let GN = 0;
function gen() {
  if (R.filter((recipe) => recipe.id > 8).length >= MAX_CUSTOM_RECIPES)
    return toast("You have reached the 100 saved-recipe limit");
  const src = S.cdet.length ? S.cdet : S.inv,
    ok = src.filter((x) => x.q > 0 && !bad(x.n) && dietOk(x.n)),
    out = src.filter((x) => bad(x.n) || !dietOk(x.n)).map((x) => x.n);
  if (ok.length < 2)
    return toast("Need at least 2 usable ingredients after allergies and diet");
  $("#rl").innerHTML = sk(3);
  setTimeout(() => {
    const o = ok.slice(),
      n = Math.min(4, o.length),
      pk = [];
    for (let i = 0; i < n; i++)
      pk.push(o.splice((GN * 2 + i * 3) % o.length, 1)[0]);
    const names = pk.map((x) => x.n),
      P = ["egg", "chicken", "paneer", "chickpeas", "lentils"],
      hp = names.some((x) => P.includes(x)),
      ST = [
        [
          "skillet",
          "Heat oil in a wide pan.|Add the firmer ingredients and cook 5 minutes.|Add the rest, season and cook until tender.",
        ],
        [
          "curry",
          "Fry onion or garlic if available in oil until soft.|Add the main ingredients and spices, cook 8 minutes.|Add a little water and simmer 10 minutes.",
        ],
        [
          "stir fry",
          "Heat a pan until very hot.|Stir fry the firmer ingredients 4 minutes.|Add the rest, toss for 2 minutes and season.",
        ],
        [
          "bowl",
          "Cook the main ingredients separately until just done.|Season each lightly.|Combine in a bowl and serve warm.",
        ],
      ],
      sy = ST[GN % 4],
      r = {
        id: Math.max(...R.map((recipe) => Number(recipe.id) || 0)) + 1,
        name: cap(names[0]) + " and " + names[1] + " " + sy[0],
        time: 15 + n * 5,
        diff: "Easy",
        diet: names.includes("chicken")
          ? "nonveg"
          : names.includes("egg")
            ? "egg"
            : names.some((x) => ["paneer", "yogurt"].includes(x))
              ? "veg"
              : "vegan",
        kcal: 280 + n * 45,
        pro: hp ? 22 : 9,
        ing: pk.map((x) => ({
          n: x.n,
          u: x.u,
          q: x.u == "pc" ? Math.min(x.q, 2) : Math.min(x.q, 200),
        })),
        prep: [
          "Wash and chop " + names.join(", ") + ".",
          "Measure the quantities listed.",
        ],
        cook: sy[1].split("|"),
        gen: true,
      };
    GN++;
    R.push(r);
    $("#gm").textContent =
      "Used: " +
      names.join(", ") +
      "." +
      (out.length
        ? " Left out for your allergies or diet: " + out.join(", ") + "."
        : "");
    draw();
    show(r.id);
  }, 250);
}
function recipeSnapshot(recipe) {
  return {
    name: recipe.name,
    time: recipe.time,
    diff: recipe.diff,
    diet: recipe.diet,
    kcal: recipe.kcal,
    pro: recipe.pro,
    ing: recipe.ing.map((ingredient) => ({ ...ingredient })),
    prep: [...recipe.prep],
    cook: [...recipe.cook],
    src: recipe.src || "",
    gen: Boolean(recipe.gen),
  };
}
function editRecipe(id) {
  const recipe = R.find((item) => item.id == id);
  if (!recipe || recipe.id <= 8)
    return toast("Only custom recipes can be edited");
  const dietOptions = [...new Set([...Object.keys(DL), recipe.diet])]
    .map(
      (diet) =>
        `<option value="${esc(diet)}"${diet == recipe.diet ? " selected" : ""}>${esc(DL[diet] || diet)}</option>`,
    )
    .join("");
  $("#dlg .in").innerHTML = `<h2>Edit recipe</h2>
    <p class="mu">Your edits keep the recipe linked to favorites, plans and history. The previous version is saved automatically.</p>
    <label>Recipe name<input id="er-name" maxlength="120" value="${esc(recipe.name)}"></label>
    <div class="fl">
      <label>Minutes<input id="er-time" type="number" min="1" max="600" value="${recipe.time}"></label>
      <label>Difficulty<input id="er-diff" maxlength="40" value="${esc(recipe.diff)}"></label>
      <label>Diet<select id="er-diet">${dietOptions}</select></label>
      <label>Calories<input id="er-kcal" type="number" min="0" max="10000" value="${recipe.kcal}"></label>
      <label>Protein (g)<input id="er-pro" type="number" min="0" max="1000" value="${recipe.pro}"></label>
    </div>
    <label>Ingredients (one per line: name | quantity | unit)
      <textarea id="er-ingredients">${esc(recipe.ing.map((item) => `${item.n} | ${item.q} | ${item.u}`).join("\n"))}</textarea>
    </label>
    <label>Preparation steps (one per line)
      <textarea id="er-prep">${esc(recipe.prep.join("\n"))}</textarea>
    </label>
    <label>Cooking steps (one per line)
      <textarea id="er-cook">${esc(recipe.cook.join("\n"))}</textarea>
    </label>
    <div class="rw"><button class="b p" onclick="saveRecipeEdit(${recipe.id})">Save changes</button><button class="b" onclick="dtl()">Cancel</button></div>`;
  $("#dlg").hidden = false;
}
function saveRecipeEdit(id) {
  const recipe = R.find((item) => item.id == id);
  if (!recipe || recipe.id <= 8)
    return toast("Only custom recipes can be edited");
  const name = $("#er-name").value.trim(),
    time = Number($("#er-time").value),
    diff = $("#er-diff").value.trim(),
    diet = $("#er-diet").value,
    kcalValue = $("#er-kcal").value.trim(),
    proValue = $("#er-pro").value.trim(),
    kcal = Number(kcalValue),
    pro = Number(proValue);
  if (!name || name.length > 120)
    return toast("Enter a recipe name up to 120 characters");
  if (!Number.isInteger(time) || time < 1 || time > 600)
    return toast("Cooking time must be from 1 to 600 minutes");
  if (!diff || diff.length > 40)
    return toast("Enter a difficulty up to 40 characters");
  if (!kcalValue || !Number.isInteger(kcal) || kcal < 0 || kcal > 10000)
    return toast("Calories must be from 0 to 10000");
  if (!proValue || !Number.isInteger(pro) || pro < 0 || pro > 1000)
    return toast("Protein must be from 0 to 1000 grams");

  const ingredientLines = $("#er-ingredients").value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!ingredientLines.length || ingredientLines.length > 100)
    return toast("Enter between 1 and 100 ingredients");
  const ingredients = [];
  for (const line of ingredientLines) {
    const parts = line.split("|").map((part) => part.trim());
    const quantity = Number(parts[1]);
    if (
      parts.length != 3 ||
      !parts[0] ||
      parts[0].length > 100 ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 100000 ||
      !parts[2] ||
      parts[2].length > 10
    )
      return toast("Use name | positive quantity | unit for each ingredient");
    ingredients.push({ n: parts[0].toLowerCase(), q: quantity, u: parts[2] });
  }

  const parseSteps = (selector) =>
    $(selector)
      .value.split(/\r?\n/)
      .map((step) => step.trim())
      .filter(Boolean);
  const prep = parseSteps("#er-prep"),
    cook = parseSteps("#er-cook");
  if (!prep.length || !cook.length || prep.length > 50 || cook.length > 50)
    return toast("Add 1 to 50 preparation steps and 1 to 50 cooking steps");
  if ([...prep, ...cook].some((step) => step.length > 1000))
    return toast("Each recipe step must be at most 1000 characters");

  const previous = recipeSnapshot(recipe),
    updated = {
      ...previous,
      name,
      time,
      diff,
      diet,
      kcal,
      pro,
      ing: ingredients,
      prep,
      cook,
    };
  if (JSON.stringify(previous) === JSON.stringify(updated)) {
    dtl();
    return toast("No recipe changes to save");
  }
  recipe.versions = [
    { savedAt: new Date().toISOString(), snapshot: previous },
    ...(recipe.versions || []),
  ].slice(0, MAX_RECIPE_VERSIONS);
  Object.assign(recipe, updated);
  scheduleSave();
  dtl();
  toast("Recipe updated; previous version saved");
}
function restoreRecipeVersion(id, index) {
  const recipe = R.find((item) => item.id == id),
    versions = recipe && recipe.versions;
  if (!recipe || recipe.id <= 8 || !Array.isArray(versions) || !versions[index])
    return toast("That recipe version is no longer available");
  const previous = recipeSnapshot(recipe),
    target = versions[index].snapshot;
  if (!target || typeof target.name != "string")
    return toast("That recipe version is invalid");
  recipe.versions = [
    { savedAt: new Date().toISOString(), snapshot: previous },
    ...versions.filter((_, versionIndex) => versionIndex != index),
  ].slice(0, MAX_RECIPE_VERSIONS);
  Object.assign(recipe, target);
  scheduleSave();
  dtl();
  toast("Recipe version restored");
}
function show(id) {
  S.open = id;
  S.sv = 2;
  S.hist = S.hist.filter((h) => h.id != id);
  S.hist.unshift({ id, t: new Date().toLocaleString() });
  S.hist = S.hist.slice(0, 30);
  dtl();
}
function cl() {
  $("#dlg").hidden = true;
  draw();
}
function dtl() {
  const r = R.find((x) => x.id == S.open),
    k = S.sv / 2,
    s = stat(r, k),
    sv = S.fav.has(r.id),
    editTools =
      r.id > 8
        ? `<div class="rw"><button class="b" onclick="editRecipe(${r.id})">Edit recipe</button><span class="mu sm2">${(r.versions || []).length} previous version${(r.versions || []).length == 1 ? "" : "s"} saved</span></div>${(r.versions || []).length ? `<h3>Version history</h3>${r.versions.map((version, index) => `<div class="rw"><span class="mu sm2" style="flex:1">${esc(version.snapshot.name)} · ${esc(version.savedAt)}</span><button class="b sm" onclick="restoreRecipeVersion(${r.id},${index})">Restore</button></div>`).join("")}` : ""}`
        : "";
  $("#dlg .in").innerHTML =
    `<div style="display:flex;justify-content:space-between;gap:12px"><div><div class="up n">${DL[r.diet]} · ${r.diff} · ${r.time} min</div><h2>${esc(r.name)}</h2></div><button class="b sm" style="align-self:flex-start" onclick="cl()">Close</button></div>
${algOf(r).length ? '<p class="tg" style="color:var(--c);border-color:var(--c)">Contains your allergen: ' + algOf(r).join(", ") + "</p>" : ""}<p class="mu">Contains: ${allAlg(r).join(", ") || "no listed allergens"}. Per serving: ${r.kcal} kcal, ${r.pro} g protein. ${s.miss.length ? s.miss.length + " ingredient" + (s.miss.length > 1 ? "s" : "") + " short in inventory." : "Everything is in stock."}</p>${editTools}
<div class="rw"><span class="mu">Servings</span><button class="b sm" onclick="S.sv=Math.max(1,S.sv-1);dtl()">-</button><b class="w" style="font-size:22px">${S.sv}</b><button class="b sm" onclick="S.sv++;dtl()">+</button><span style="flex:1"></span><button class="b ${sv ? "p" : ""}" onclick="tf()">${sv ? "Saved" : "Save recipe"}</button></div>
<h3 style="margin-top:18px">Ingredients</h3>${r.ing
      .map((i) => {
        const need = i.q * k,
          hv = have(i.n, i.u);
        return `<div class="rw"><span style="flex:1">${esc(cap(i.n))}</span><span>${fq(need)} ${i.u}</span><span class="tg">${hv >= need ? "in stock" : "need " + fq(need - hv) + " " + i.u}</span></div>`;
      })
      .join("")}
<h3 style="margin-top:18px">Preparation</h3><ol>${r.prep.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><h3>Cooking</h3><ol>${r.cook.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
<h3>Customise</h3><textarea placeholder="Your changes, for example less spice or swap yogurt for coconut milk" onchange="S.notes[${r.id}]=this.value;scheduleSave()">${esc(S.notes[r.id] || "")}</textarea>
<h3 style="margin-top:18px">Add to planner</h3><div class="rw"><select id="pd">${DN.map((d) => `<option>${d}</option>`).join("")}</select><select id="pm"><option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option></select><button class="b c" onclick="addP()">Add</button></div>`;
  $("#dlg").hidden = false;
  scheduleSave();
}
function tf() {
  S.fav.has(S.open) ? S.fav.delete(S.open) : S.fav.add(S.open);
  dtl();
}
function doImp() {
  if (R.filter((recipe) => recipe.id > 8).length >= MAX_CUSTOM_RECIPES)
    return toast("You have reached the 100 saved-recipe limit");
  const u = $("#yu").value.trim(),
    m = u.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
  if (!m) return toast("Enter a valid YouTube link");
  $("#io").innerHTML = sk(3);
  setTimeout(() => {
    const b = R[(m[1].charCodeAt(0) + m[1].charCodeAt(1)) % 8],
      r = {
        ...b,
        id: Math.max(...R.map((recipe) => Number(recipe.id) || 0)) + 1,
        name: "Imported recipe " + m[1].slice(0, 4),
        src: u,
      };
    R.push(r);
    scheduleSave();
    $("#io").innerHTML =
      `<div class="rw"><span class="gr" style="flex:1">${esc(r.name)}</span><button class="b p" onclick="show(${r.id})">Open recipe</button></div><p class="mu sm2">${r.ing.length} ingredients and ${r.prep.length + r.cook.length} steps added to your recipe list.</p>`;
  }, 1600);
}
function legal(k) {
  $("#dlg .in").innerHTML =
    `<h2>${k == "p" ? "Privacy" : "Terms"}</h2><p class="mu">${k == "p" ? "Account details and workspace data are stored by the Savorelle backend. Guest workspace data remains in this browser. Scan images are sent for analysis and are not retained by this application. Review the full privacy policy for details." : "This is a demonstration build. Recipe generation and video extraction are simulated; photo analysis requires a configured OpenAI API key. Check ingredients, allergens, quantities and food safety before cooking."}</p><button class="b" onclick="cl()">Close</button>`;
  $("#dlg").hidden = false;
}
const header = $("header");
const syncHeroHeight = () =>
  document.documentElement.style.setProperty(
    "--hero-header-offset",
    `${header.getBoundingClientRect().height}px`,
  );
new ResizeObserver(syncHeroHeight).observe(header);
syncHeroHeight();
startApp();
