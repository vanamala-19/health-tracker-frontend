(() => {
  const API_BASE =
    typeof API_BASE_URL !== "undefined"
      ? API_BASE_URL
      : "https://health-tracker-backend-z131.onrender.com";

  const state = {
    foods: [],
    mealItems: [],
  };

  const el = (id) => document.getElementById(id);

  const foodSelect = el("foodSelect");
  const foodQty = el("foodQty");
  const addFoodBtn = el("addFood");
  const mealItemsTable = el("mealItemsTable");
  const totalCalories = el("totalCalories");
  const totalProtein = el("totalProtein");
  const totalCarbs = el("totalCarbs");
  const totalFats = el("totalFats");
  const clearMealBtn = el("clearMeal");
  const copyMealDataBtn = el("copyMealData");

  const targetCalories = el("targetCalories");
  const targetProtein = el("targetProtein");
  const targetCarbs = el("targetCarbs");
  const targetFats = el("targetFats");
  const maxGrams = el("maxGrams");
  const mealCount = el("mealCount");
  const mustUseList = el("mustUseList");
  const planOutput = el("planOutput");
  const planSummary = el("planSummary");
  const planAccuracy = el("planAccuracy");
  const generatePlanBtn = el("generatePlan");
  const copyPlanBtn = el("copyPlan");
  const mustUseSearch = el("mustUseSearch");

  const bodyWeight = el("bodyWeight");
  const goalSelect = el("goalSelect");
  const calcRecommendation = el("calcRecommendation");

  const suggestionList = el("suggestionList");
  const suggestFoodName = el("suggestFoodName");
  const suggestFoodNotes = el("suggestFoodNotes");
  const copySuggestion = el("copySuggestion");

  const apiStatus = el("apiStatus");
  const refreshFood = el("refreshFood");

  const scrollButtons = document.querySelectorAll("[data-scroll]");
  const mealPresetButtons = document.querySelectorAll(".meal-preset");

  function setStatus(text, ok) {
    apiStatus.textContent = text;
    apiStatus.style.color = ok ? "#2f6f4e" : "#b04b3f";
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function perGram(food) {
    const unit = safeNumber(food.unit) || 100;
    return {
      calories: safeNumber(food.calories) / unit,
      protein: safeNumber(food.protein) / unit,
      carbs: safeNumber(food.carbs) / unit,
      fat: safeNumber(food.fat) / unit,
    };
  }

  function renderFoodOptions() {
    foodSelect.innerHTML = "";
    state.foods.forEach((f, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = f.name;
      foodSelect.appendChild(opt);
    });
  }

  function renderPantry() {
    const query = mustUseSearch ? mustUseSearch.value.trim().toLowerCase() : "";
    mustUseList.innerHTML = "";
    state.foods.forEach((food, idx) => {
      if (query && !food.name.toLowerCase().includes(query)) return;
      const mustRow = document.createElement("label");
      const mustCheck = document.createElement("input");
      mustCheck.type = "checkbox";
      mustCheck.value = idx;
      const gramsInput = document.createElement("input");
      gramsInput.type = "number";
      gramsInput.min = "0";
      gramsInput.placeholder = "grams";
      gramsInput.className = "must-use-grams";
      gramsInput.dataset.foodIndex = idx;
      mustRow.appendChild(mustCheck);
      mustRow.appendChild(document.createTextNode(food.name));
      mustRow.appendChild(gramsInput);
      mustUseList.appendChild(mustRow);
    });
  }

  function renderMealItems() {
    let html = `
      <tr>
        <th>Food</th>
        <th>Grams</th>
        <th>Calories</th>
        <th>Protein</th>
        <th></th>
      </tr>
    `;

    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    state.mealItems.forEach((item, idx) => {
      const macro = perGram(item.food);
      const grams = item.grams;
      const calories = macro.calories * grams;
      const protein = macro.protein * grams;
      const carbs = macro.carbs * grams;
      const fat = macro.fat * grams;

      totals.calories += calories;
      totals.protein += protein;
      totals.carbs += carbs;
      totals.fat += fat;

      html += `
        <tr>
          <td>${item.food.name}</td>
          <td>${grams}</td>
          <td>${calories.toFixed(0)}</td>
          <td>${protein.toFixed(1)}</td>
          <td><button class="btn" data-remove="${idx}">Remove</button></td>
        </tr>
      `;
    });

    mealItemsTable.innerHTML = html;
    totalCalories.textContent = totals.calories.toFixed(0);
    totalProtein.textContent = `${totals.protein.toFixed(1)} g`;
    totalCarbs.textContent = `${totals.carbs.toFixed(1)} g`;
    totalFats.textContent = `${totals.fat.toFixed(1)} g`;

    mealItemsTable.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.remove);
        state.mealItems.splice(idx, 1);
        renderMealItems();
      });
    });
  }

  function addFoodItem() {
    const idx = Number(foodSelect.value);
    const grams = safeNumber(foodQty.value);

    if (!Number.isFinite(idx) || !state.foods[idx]) {
      return;
    }

    if (!grams) {
      notifyError("Enter grams for the food item.");
      return;
    }

    state.mealItems.push({
      food: state.foods[idx],
      grams,
    });

    foodQty.value = "";
    renderMealItems();
  }

  function clearMeal() {
    state.mealItems = [];
    renderMealItems();
  }

  function getSelectedPantryFoods() {
    const selected = [];
    mustUseList.querySelectorAll("input[type=checkbox]").forEach((input) => {
      if (input.checked) {
        const idx = Number(input.value);
        if (state.foods[idx]) selected.push(state.foods[idx]);
      }
    });
    return selected;
  }

  function getMustUseItems() {
    const items = [];
    mustUseList.querySelectorAll("label").forEach((row) => {
      const checkbox = row.querySelector("input[type=checkbox]");
      const gramsInput = row.querySelector("input.must-use-grams");
      if (!checkbox || !gramsInput) return;
      if (!checkbox.checked) return;
      const idx = Number(checkbox.value);
      const grams = safeNumber(gramsInput.value);
      if (!Number.isFinite(idx) || !state.foods[idx]) return;
      items.push({ food: state.foods[idx], grams: grams > 0 ? grams : null });
    });
    return items;
  }

  function generatePlan() {
    const targetCals = safeNumber(targetCalories.value);
    const targetProt = safeNumber(targetProtein.value);
    const targetCarb = safeNumber(targetCarbs.value);
    const targetFat = safeNumber(targetFats.value);
    const maxPerFood = safeNumber(maxGrams.value) || 300;
    const mealsPerDay = Math.max(
      1,
      Math.min(6, safeNumber(mealCount.value) || 2),
    );
    if (!targetCals || !targetProt || !targetCarb || !targetFat) {
      notifyError("Enter target calories, protein, carbs, and fats.");
      return;
    }

    if (maxPerFood < 1) {
      notifyError("Max grams per food must be at least 1.");
      return;
    }

    const foods = getSelectedPantryFoods();
    if (!foods.length) {
      notifyError("Select at least one food for planning.");
      return;
    }
    const ranked = foods
      .map((food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.protein / macro.calories : 0;
        const carbDensity = macro.calories ? macro.carbs / macro.calories : 0;
        const fatDensity = macro.calories ? macro.fat / macro.calories : 0;
        const carbPerGram = macro.carbs;
        const calorieDensity = macro.calories;
        const caloriesPerGram = macro.calories;
        return {
          food,
          macro,
          density,
          carbDensity,
          fatDensity,
          carbPerGram,
          calorieDensity,
          caloriesPerGram,
        };
      })
      .sort((a, b) => {
        if (b.density !== a.density) return b.density - a.density;
        return a.caloriesPerGram - b.caloriesPerGram;
      });

    const proteinCapTotal = targetProt;

    const meals = Array.from({ length: mealsPerDay }, (_, idx) => ({
      name: `Meal ${idx + 1}`,
      pct: 100 / mealsPerDay,
    }));

    const mealPlans = meals.map((meal) => {
      const fraction = meal.pct / 100;
      return {
        name: meal.name,
        targetCalories: targetCals * fraction,
        targetProtein: targetProt * fraction,
        targetCarbs: targetCarb * fraction,
        targetFats: targetFat * fraction,
        proteinCap: proteinCapTotal * fraction,
        items: [],
      };
    });

    const addOrMerge = (meal, food, grams, macros) => {
      const existing = meal.items.find((i) => i.food.name === food.name);
      if (existing) {
        existing.grams += grams;
        existing.calories += macros.calories;
        existing.protein += macros.protein;
        existing.carbs += macros.carbs;
        existing.fat += macros.fat;
      } else {
        meal.items.push({ food, grams, ...macros });
      }
    };

    const mustUse = getMustUseItems();
    const maxByFoodName = new Map();
    mustUse.forEach((item) => {
      if (item.grams && item.grams > 0) {
        maxByFoodName.set(item.food.name, item.grams);
      }
    });
    const usedByFoodName = new Map();

    const applyFoodCap = (foodName, grams) => {
      const cap = maxByFoodName.get(foodName);
      if (!cap) return grams;
      const used = usedByFoodName.get(foodName) || 0;
      const remaining = cap - used;
      if (remaining <= 0) return 0;
      return Math.min(grams, remaining);
    };

    mealPlans.forEach((meal) => {
      let remainingProtein = Math.max(0, meal.targetProtein);
      let remainingProteinCap = Math.max(0, meal.proteinCap);
      let remainingCarbs = Math.max(0, meal.targetCarbs);
      let remainingFats = Math.max(0, meal.targetFats);
      let remainingCalories = Math.max(0, meal.targetCalories);

      const capByProtein = (grams, proteinPerGram) => {
        if (!proteinPerGram) return grams;
        const maxByProtein = remainingProteinCap / proteinPerGram;
        return Math.max(0, Math.min(grams, maxByProtein));
      };

      const capByCarbs = (grams, carbsPerGram) => {
        if (!carbsPerGram) return grams;
        const maxByCarbs = remainingCarbs / carbsPerGram;
        return Math.max(0, Math.min(grams, maxByCarbs));
      };

      const capByFats = (grams, fatsPerGram) => {
        if (!fatsPerGram) return grams;
        const maxByFats = remainingFats / fatsPerGram;
        return Math.max(0, Math.min(grams, maxByFats));
      };

      const capByCalories = (grams, caloriesPerGram) => {
        if (!caloriesPerGram) return grams;
        const maxByCalories = remainingCalories / caloriesPerGram;
        return Math.max(0, Math.min(grams, maxByCalories));
      };

      const capByCalorieReserve = (grams, caloriesPerGram, reserveCalories) => {
        if (!caloriesPerGram) return grams;
        const available = Math.max(0, remainingCalories - reserveCalories);
        const maxByCalories = available / caloriesPerGram;
        return Math.max(0, Math.min(grams, maxByCalories));
      };

      // Phase 1: Protein first (prioritize protein target)
      ranked.forEach((item) => {
        if (remainingProtein <= 0 || remainingCalories <= 0) return;
        if (item.macro.protein <= 0) return;

        const gramsForProtein = remainingProtein / item.macro.protein;
        let gramsCap = Math.min(gramsForProtein, maxPerFood);
        gramsCap = capByProtein(gramsCap, item.macro.protein);
        gramsCap = capByCalories(gramsCap, item.macro.calories);
        if (gramsCap <= 0) return;

        let finalGrams = Math.floor(gramsCap);
        finalGrams = applyFoodCap(item.food.name, finalGrams);
        if (finalGrams <= 0) return;

        const calories = finalGrams * item.macro.calories;
        const protein = finalGrams * item.macro.protein;
        const carbs = finalGrams * item.macro.carbs;
        const fat = finalGrams * item.macro.fat;

        addOrMerge(meal, item.food, finalGrams, {
          calories,
          protein,
          carbs,
          fat,
        });
        usedByFoodName.set(
          item.food.name,
          (usedByFoodName.get(item.food.name) || 0) + finalGrams,
        );

        remainingProtein -= protein;
        remainingProteinCap -= protein;
        remainingCarbs -= carbs;
        remainingFats -= fat;
        remainingCalories -= calories;
      });

      // Phase 2: Carbs
      if (remainingProtein <= 0 && remainingCarbs > 0) {
        const carbRank = [...ranked].sort((a, b) => {
          const scoreA =
            a.carbPerGram - a.macro.fat * 0.3 - a.macro.protein * 0.1;
          const scoreB =
            b.carbPerGram - b.macro.fat * 0.3 - b.macro.protein * 0.1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.caloriesPerGram - b.caloriesPerGram;
        });
        carbRank.forEach((item) => {
          if (remainingCarbs <= 0 || remainingCalories <= 0) return;
          if (item.macro.carbs <= 0) return;
          const gramsForCarbs = remainingCarbs / item.macro.carbs;
          let gramsCap = Math.min(gramsForCarbs, maxPerFood);
          if (remainingProtein > 0) {
            gramsCap = capByProtein(gramsCap, item.macro.protein);
          }
          // Do not cap carbs by fat; allow carbs to rise even if fats are met.
          gramsCap = capByCalorieReserve(
            gramsCap,
            item.macro.calories,
            remainingFats * 9,
          );
          if (gramsCap <= 0) return;

          let finalGrams = Math.round(gramsCap);
          finalGrams = applyFoodCap(item.food.name, finalGrams);
          if (finalGrams <= 0) return;

          const calories = finalGrams * item.macro.calories;
          const protein = finalGrams * item.macro.protein;
          const carbs = finalGrams * item.macro.carbs;
          const fat = finalGrams * item.macro.fat;

          addOrMerge(meal, item.food, finalGrams, {
            calories,
            protein,
            carbs,
            fat,
          });
          usedByFoodName.set(
            item.food.name,
            (usedByFoodName.get(item.food.name) || 0) + finalGrams,
          );

          remainingCarbs -= carbs;
          remainingFats -= fat;
          remainingProteinCap -= protein;
          remainingCalories -= calories;
        });
      }

      // Phase 3: Fats
      if (remainingProtein <= 0 && remainingFats > 0) {
        const fatRank = [...ranked].sort((a, b) => {
          if (b.fatDensity !== a.fatDensity) return b.fatDensity - a.fatDensity;
          return a.caloriesPerGram - b.caloriesPerGram;
        });
        fatRank.forEach((item) => {
          if (remainingFats <= 0 || remainingCalories <= 0) return;
          if (item.macro.fat <= 0) return;
          const gramsForFats = remainingFats / item.macro.fat;
          let gramsCap = Math.min(gramsForFats, maxPerFood);
          gramsCap = capByProtein(gramsCap, item.macro.protein);
          gramsCap = capByCarbs(gramsCap, item.macro.carbs);
          gramsCap = capByCalories(gramsCap, item.macro.calories);
          if (gramsCap <= 0) return;

          let finalGrams = Math.round(gramsCap);
          finalGrams = applyFoodCap(item.food.name, finalGrams);
          if (finalGrams <= 0) return;

          const calories = finalGrams * item.macro.calories;
          const protein = finalGrams * item.macro.protein;
          const carbs = finalGrams * item.macro.carbs;
          const fat = finalGrams * item.macro.fat;

          addOrMerge(meal, item.food, finalGrams, {
            calories,
            protein,
            carbs,
            fat,
          });
          usedByFoodName.set(
            item.food.name,
            (usedByFoodName.get(item.food.name) || 0) + finalGrams,
          );

          remainingFats -= fat;
          remainingProteinCap -= protein;
          remainingCalories -= calories;
        });
      }

      // Phase 4: Calories
      if (remainingCalories > 0 && goalSelect.value !== "cut") {
        const caloriesRank = [...ranked].sort(
          (a, b) => a.caloriesPerGram - b.caloriesPerGram,
        );

        caloriesRank.forEach((item) => {
          if (remainingCalories <= 0) return;
          if (item.macro.calories <= 0) return;
          const gramsForCalories = remainingCalories / item.macro.calories;
          let gramsCap = Math.min(gramsForCalories, maxPerFood);
          gramsCap = capByProtein(gramsCap, item.macro.protein);
          gramsCap = capByCarbs(gramsCap, item.macro.carbs);
          gramsCap = capByFats(gramsCap, item.macro.fat);
          gramsCap = capByCalories(gramsCap, item.macro.calories);
          if (gramsCap <= 0) return;

          let finalGrams = Math.round(gramsCap);
          finalGrams = applyFoodCap(item.food.name, finalGrams);
          if (finalGrams <= 0) return;

          const calories = finalGrams * item.macro.calories;
          const protein = finalGrams * item.macro.protein;
          const carbs = finalGrams * item.macro.carbs;
          const fat = finalGrams * item.macro.fat;

          addOrMerge(meal, item.food, finalGrams, {
            calories,
            protein,
            carbs,
            fat,
          });
          usedByFoodName.set(
            item.food.name,
            (usedByFoodName.get(item.food.name) || 0) + finalGrams,
          );

          remainingProteinCap -= protein;
          remainingCalories -= calories;
        });
      }

      if (
        remainingProtein <= 0 &&
        remainingCarbs > 0 &&
        remainingCalories > 0
      ) {
        const carbRank = [...ranked].sort((a, b) => {
          const scoreA =
            a.carbPerGram - a.macro.fat * 0.3 - a.macro.protein * 0.1;
          const scoreB =
            b.carbPerGram - b.macro.fat * 0.3 - b.macro.protein * 0.1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.caloriesPerGram - b.caloriesPerGram;
        });
        carbRank.forEach((item) => {
          if (remainingCarbs <= 0 || remainingCalories <= 0) return;
          if (item.macro.carbs <= 0) return;
          const gramsForCarbs = remainingCarbs / item.macro.carbs;
          let gramsCap = Math.min(gramsForCarbs, maxPerFood);
          if (remainingProtein > 0) {
            gramsCap = capByProtein(gramsCap, item.macro.protein);
          }
          gramsCap = capByCalories(gramsCap, item.macro.calories);
          if (gramsCap <= 0) return;

          let finalGrams = Math.round(gramsCap);
          finalGrams = applyFoodCap(item.food.name, finalGrams);
          if (finalGrams <= 0) return;

          const calories = finalGrams * item.macro.calories;
          const protein = finalGrams * item.macro.protein;
          const carbs = finalGrams * item.macro.carbs;
          const fat = finalGrams * item.macro.fat;

          addOrMerge(meal, item.food, finalGrams, {
            calories,
            protein,
            carbs,
            fat,
          });
          usedByFoodName.set(
            item.food.name,
            (usedByFoodName.get(item.food.name) || 0) + finalGrams,
          );

          remainingCarbs -= carbs;
          remainingProteinCap -= protein;
          remainingCalories -= calories;
        });
      }

      if (remainingCalories > 0 && goalSelect.value === "cut") {
        notifyError(
          "Cut mode: remaining calories are left unused to avoid overshooting targets.",
        );
      }
    });

    const flatPlan = mealPlans.flatMap((meal) => meal.items);
    renderPlan(mealPlans, targetCals, targetProt, targetCarb, targetFat);
    renderSuggestions(targetCals, targetProt, targetCarb, targetFat, flatPlan);
  }

  // --- new planning helpers / replacements ---
  /**
   * Pure function that builds a meal plan from raw inputs.
   * Returns an object with meals array and daily breakdown plus any leftover reminders.
   */
  function buildMealPlan({
    foods,
    targets,
    mealsPerDay = 3,
    maxPerFood = 300,
    mustUse = [],
    goal = "maintain",
    autoExpandCut = false,
  }) {
    const {
      calories: targetCals,
      protein: targetProt,
      carbs: targetCarb,
      fats: targetFat,
    } = targets;
    // allow zero values but ensure numeric
    if (
      !Number.isFinite(targetCals) ||
      !Number.isFinite(targetProt) ||
      !Number.isFinite(targetCarb) ||
      !Number.isFinite(targetFat)
    ) {
      throw new Error("missing targets");
    }
    if (maxPerFood < 1 && !(goal === "cut" && autoExpandCut)) {
      throw new Error("maxPerFood must be >=1");
    }

    const effectiveMax =
      goal === "cut" && autoExpandCut ? Infinity : maxPerFood;

    const ranked = foods
      .map((food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.protein / macro.calories : 0;
        const carbDensity = macro.calories ? macro.carbs / macro.calories : 0;
        const fatDensity = macro.calories ? macro.fat / macro.calories : 0;
        return {
          food,
          macro,
          density,
          carbDensity,
          fatDensity,
          carbPerGram: macro.carbs,
          caloriesPerGram: macro.calories,
        };
      })
      .sort((a, b) => {
        if (b.density !== a.density) return b.density - a.density;
        return a.caloriesPerGram - b.caloriesPerGram;
      });

    const maxByFoodName = new Map();
    mustUse.forEach((item) => {
      if (item.grams && item.grams > 0) {
        maxByFoodName.set(item.food.name, item.grams);
      }
    });
    const usedByFoodName = new Map();
    const applyFoodCap = (name, g) => {
      const cap = maxByFoodName.get(name);
      if (!cap) return g;
      const used = usedByFoodName.get(name) || 0;
      const remain = cap - used;
      if (remain <= 0) return 0;
      return Math.min(g, remain);
    };

    const daily = [];
    let remProt = targetProt;
    let remCarb = targetCarb;
    let remFat = targetFat;
    let remCal = targetCals;

    const capBy = {
      protein: (g, p) => {
        if (!p || remProt <= 0) return g;
        return Math.max(0, Math.min(g, remProt / p));
      },
      carbs: (g, p) => {
        if (!p || remCarb <= 0) return g;
        return Math.max(0, Math.min(g, remCarb / p));
      },
      fats: (g, p) => {
        if (!p || remFat <= 0) return g;
        return Math.max(0, Math.min(g, remFat / p));
      },
      calories: (g, p) => {
        if (!p || remCal <= 0) return g;
        return Math.max(0, Math.min(g, remCal / p));
      },
    };
    const reserveCalc = (g, p, res) => {
      if (!p) return g;
      const avail = Math.max(0, remCal - res);
      return Math.max(0, Math.min(g, avail / p));
    };

    const makeChoice = (item, gcap) => {
      let final = autoExpandCut && goal === "cut" ? gcap : Math.floor(gcap);
      final = applyFoodCap(item.food.name, final);
      if (final <= 0) return null;
      const c = final * item.macro.calories;
      const p = final * item.macro.protein;
      const cb = final * item.macro.carbs;
      const f = final * item.macro.fat;
      remProt -= p;
      remCarb -= cb;
      remFat -= f;
      remCal -= c;
      usedByFoodName.set(
        item.food.name,
        (usedByFoodName.get(item.food.name) || 0) + final,
      );
      return {
        food: item.food,
        grams: final,
        calories: c,
        protein: p,
        carbs: cb,
        fat: f,
      };
    };

    // protein phase
    ranked.forEach((item) => {
      if (remProt <= 0 || remCal <= 0) return;
      if (item.macro.protein <= 0) return;
      let cap = remProt / item.macro.protein;
      cap = Math.min(cap, effectiveMax);
      cap = capBy.protein(cap, item.macro.protein);
      cap = capBy.calories(cap, item.macro.calories);
      const choice = makeChoice(item, cap);
      if (choice) daily.push(choice);
    });

    // carbs phase
    if (remProt <= 0 && remCarb > 0) {
      const carbRank = [...ranked].sort((a, b) => {
        const sA = a.carbPerGram - a.macro.fat * 0.3 - a.macro.protein * 0.1;
        const sB = b.carbPerGram - b.macro.fat * 0.3 - b.macro.protein * 0.1;
        if (sB !== sA) return sB - sA;
        return a.caloriesPerGram - b.caloriesPerGram;
      });
      carbRank.forEach((item) => {
        if (remCarb <= 0 || remCal <= 0) return;
        if (item.macro.carbs <= 0) return;
        let cap = remCarb / item.macro.carbs;
        cap = Math.min(cap, effectiveMax);
        if (remProt > 0) cap = capBy.protein(cap, item.macro.protein);
        cap = reserveCalc(cap, item.macro.calories, remFat * 9);
        const choice = makeChoice(item, cap);
        if (choice) daily.push(choice);
      });
    }

    // fats phase
    if (remProt <= 0 && remFat > 0) {
      const fatRank = [...ranked].sort((a, b) => {
        if (b.fatDensity !== a.fatDensity) return b.fatDensity - a.fatDensity;
        return a.caloriesPerGram - b.caloriesPerGram;
      });
      fatRank.forEach((item) => {
        if (remFat <= 0 || remCal <= 0) return;
        if (item.macro.fat <= 0) return;
        let cap = remFat / item.macro.fat;
        cap = Math.min(cap, effectiveMax);
        cap = capBy.protein(cap, item.macro.protein);
        cap = capBy.carbs(cap, item.macro.carbs);
        cap = capBy.calories(cap, item.macro.calories);
        const choice = makeChoice(item, cap);
        if (choice) daily.push(choice);
      });
    }

    // calories phase
    if (remCal > 0 && goal != "cut") {
      const calRank = [...ranked].sort(
        (a, b) => b.caloriesPerGram - a.caloriesPerGram,
      );
      calRank.forEach((item) => {
        if (remCal <= 0) return;
        if (item.macro.calories <= 0) return;
        let cap = remCal / item.macro.calories;
        cap = Math.min(cap, effectiveMax);
        cap = capBy.protein(cap, item.macro.protein);
        cap = capBy.carbs(cap, item.macro.carbs);
        cap = capBy.fats(cap, item.macro.fat);
        cap = capBy.calories(cap, item.macro.calories);
        const choice = makeChoice(item, cap);
        if (choice) daily.push(choice);
      });
    }

    const meals = Array.from({ length: mealsPerDay }, (_, i) => ({
      name: `Meal ${i + 1}`,
      pct: 100 / mealsPerDay,
      items: [],
    }));
    meals.forEach((m) => {
      daily.forEach((item) => {
        const g = item.grams * (m.pct / 100);
        if (g > 0) m.items.push({ ...item, grams: g });
      });
    });

    return { meals, daily, reminders: { remCal, remProt, remCarb, remFat } };
  }

  // replace original generatePlan with the new logic
  const __oldGeneratePlan = generatePlan;
  function generatePlan() {
    const targetCals = safeNumber(targetCalories.value);
    const targetProt = safeNumber(targetProtein.value);
    const targetCarb = safeNumber(targetCarbs.value);
    const targetFat = safeNumber(targetFats.value);
    let maxPerFood = safeNumber(maxGrams.value) || 300;
    const mealsPerDay = Math.max(
      1,
      Math.min(6, safeNumber(mealCount.value) || 3),
    );
    const autoCut = el("autoExpandCut").checked;
    if (!targetCals || !targetProt || !targetCarb || !targetFat) {
      notifyError("Enter target calories, protein, carbs, and fats.");
      return;
    }
    if (maxPerFood < 1 && !(goalSelect.value === "cut" && autoCut)) {
      notifyError("Max grams per food must be at least 1.");
      return;
    }
    const foods = getSelectedPantryFoods();
    if (!foods.length) {
      notifyError("Select at least one food for planning.");
      return;
    }
    const { meals, daily, reminders } = buildMealPlan({
      foods,
      targets: {
        calories: targetCals,
        protein: targetProt,
        carbs: targetCarb,
        fats: targetFat,
      },
      mealsPerDay,
      maxPerFood,
      mustUse: getMustUseItems(),
      goal: goalSelect.value,
      autoExpandCut: autoCut,
    });
    if (goalSelect.value === "cut" && reminders.remCal > 0) {
      notifyError(
        "Cut mode: remaining calories are left unused to avoid overshooting targets.",
      );
    }
    renderPlan(meals, targetCals, targetProt, targetCarb, targetFat);
    renderSuggestions(targetCals, targetProt, targetCarb, targetFat, daily);
  }

  function renderPlan(
    mealPlans,
    targetCals,
    targetProt,
    targetCarb,
    targetFat,
  ) {
    if (!mealPlans.length || mealPlans.every((m) => !m.items.length)) {
      planOutput.innerHTML =
        "No plan could be generated with the selected foods.";
      planSummary.textContent = "";
      return;
    }

    let totalCals = 0;
    let totalProt = 0;
    let totalCarb = 0;
    let totalFat = 0;

    planOutput.innerHTML = "";
    mealPlans.forEach((meal) => {
      const section = document.createElement("div");
      const title = document.createElement("h4");
      title.textContent = meal.name;
      section.appendChild(title);

      const list = document.createElement("ul");
      if (!meal.items.length) {
        const empty = document.createElement("p");
        empty.textContent = "No items for this meal.";
        section.appendChild(empty);
      } else {
        meal.items.forEach((item) => {
          totalCals += item.calories;
          totalProt += item.protein;
          totalCarb += item.carbs || 0;
          totalFat += item.fat || 0;
          const li = document.createElement("li");
          // round grams for display (may be fractional internally)
          li.textContent = `${item.food.name} - ${Math.round(item.grams)} g`;
          list.appendChild(li);
        });
        section.appendChild(list);
      }

      planOutput.appendChild(section);
    });

    planSummary.textContent = `Plan totals: ${totalCals.toFixed(
      0,
    )} kcal, ${totalProt.toFixed(1)} g protein, ${totalCarb.toFixed(
      1,
    )} g carbs, ${totalFat.toFixed(
      1,
    )} g fats (targets ${targetCals} / ${targetProt} / ${targetCarb} / ${targetFat})`;

    const percent = (actual, target) =>
      target === 0 ? 0 : Math.round((actual / target) * 100);

    const classify = (pct) => {
      if (pct >= 95 && pct <= 105) return "good";
      if (pct >= 85 && pct < 95) return "warn";
      return "bad";
    };

    const renderChip = (label, actual, target) => {
      const pct = percent(actual, target);
      const chip = document.createElement("span");
      chip.className = `badge-chip ${classify(pct)}`;
      chip.textContent = `${label}: ${pct}%`;
      return chip;
    };

    planAccuracy.innerHTML = "";
    planAccuracy.appendChild(renderChip("Calories", totalCals, targetCals));
    planAccuracy.appendChild(renderChip("Protein", totalProt, targetProt));
    planAccuracy.appendChild(renderChip("Carbs", totalCarb, targetCarb));
    planAccuracy.appendChild(renderChip("Fats", totalFat, targetFat));

    if (totalProt > targetProt) {
      notifyWarning(
        "Warning: Protein exceeds target. Selected foods may be too protein-heavy.",
      );
    }
    if (totalCarb > targetCarb) {
      notifyWarning("Warning: Carbs exceed target. Reduce carb-heavy items or caps.");
    }
    if (totalFat > targetFat) {
      notifyWarning("Warning: Fats exceed target. Reduce fat-heavy items or caps.");
    }
  }

  function renderSuggestions(
    targetCals,
    targetProt,
    targetCarb,
    targetFat,
    plan,
  ) {
    const usedNames = new Set(plan.map((p) => p.food.name));
    const suggestions = [];

    const planTotals = plan.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs || 0;
        acc.fat += item.fat || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    if (planTotals.protein < targetProt) {
      const deficit = (targetProt - planTotals.protein).toFixed(1);
      suggestions.push(`Add more protein. You are short by ${deficit} g.`);

      const pantryFoods = getSelectedPantryFoods();
      const maxProteinDensity = pantryFoods.reduce((max, food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.protein / macro.calories : 0;
        return Math.max(max, density);
      }, 0);

      if (maxProteinDensity < 0.05) {
        suggestions.push(
          "Protein target may be unreachable with selected foods. Add lean protein sources (chicken, fish, tofu, legumes).",
        );
      }
    }

    if (planTotals.calories < targetCals) {
      const deficit = (targetCals - planTotals.calories).toFixed(0);
      suggestions.push(`Increase calories by about ${deficit} kcal.`);
    }

    if (planTotals.carbs < targetCarb) {
      const deficit = (targetCarb - planTotals.carbs).toFixed(1);
      suggestions.push(`Increase carbs by about ${deficit} g.`);

      const pantryFoods = getSelectedPantryFoods();
      const maxCarbDensity = pantryFoods.reduce((max, food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.carbs / macro.calories : 0;
        return Math.max(max, density);
      }, 0);

      if (maxCarbDensity < 0.05) {
        suggestions.push(
          "Carb target may be unreachable with selected foods. Add carb-rich items (rice, oats, potatoes, fruit).",
        );
      }
    }

    if (planTotals.fat < targetFat) {
      const deficit = (targetFat - planTotals.fat).toFixed(1);
      suggestions.push(`Increase fats by about ${deficit} g.`);

      const pantryFoods = getSelectedPantryFoods();
      const maxFatDensity = pantryFoods.reduce((max, food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.fat / macro.calories : 0;
        return Math.max(max, density);
      }, 0);

      if (maxFatDensity < 0.02) {
        suggestions.push(
          "Fat target may be unreachable with selected foods. Add healthy fats (olive oil, nuts, avocado).",
        );
      }
    }

    const highProteinFoods = [...state.foods]
      .filter((food) => !usedNames.has(food.name))
      .map((food) => {
        const macro = perGram(food);
        const density = macro.calories ? macro.protein / macro.calories : 0;
        return { food, density };
      })
      .sort((a, b) => b.density - a.density)
      .slice(0, 3)
      .map((item) => `Consider adding ${item.food.name} for higher protein.`);

    suggestionList.innerHTML = "";
    [...suggestions, ...highProteinFoods].forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      suggestionList.appendChild(li);
    });
  }

  async function loadFoods() {
    try {
      setStatus("Loading food database...", true);
      const res = await fetch(`${API_BASE}/food-database`);
      if (!res.ok) throw new Error("Failed to load food database");
      state.foods = await res.json();
      renderFoodOptions();
      renderPantry();
      setStatus(`Loaded ${state.foods.length} foods`, true);
      if (typeof AppHealth !== "undefined") AppHealth.setStatus("healthy");
    } catch (err) {
      console.error(err);
      setStatus("Unable to reach food database API.", false);
      if (typeof AppHealth !== "undefined") {
        AppHealth.setStatus(navigator.onLine ? "degraded" : "offline");
      }
    }
  }

  function recommendTargets() {
    const weight = safeNumber(bodyWeight.value);
    if (!weight) {
      notifyError("Enter your weight in kg to calculate targets.");
      return;
    }

    let caloriesPerKg = 30;
    if (goalSelect.value === "cut") caloriesPerKg = 25;
    if (goalSelect.value === "bulk") caloriesPerKg = 35;

    const calories = Math.round(weight * caloriesPerKg);
    const protein = Math.round(weight * 1.8);
    const fats = Math.round(weight * 0.8);
    const carbs = Math.max(
      0,
      Math.round((calories - protein * 4 - fats * 9) / 4),
    );

    targetCalories.value = calories;
    targetProtein.value = protein;
    targetCarbs.value = carbs;
    targetFats.value = fats;
  }

  function copyPlan() {
    const text = planOutput.textContent.trim();
    if (!text) return;
    navigator.clipboard.writeText(text);
  }

  function copySuggestionText() {
    const name = suggestFoodName.value.trim();
    const notes = suggestFoodNotes.value.trim();
    if (!name) {
      notifyError("Add a food name first.");
      return;
    }
    const text = `Food suggestion: ${name}${notes ? ` - ${notes}` : ""}`;
    navigator.clipboard.writeText(text);
  }

  function copyMealData() {
    if (!state.mealItems.length) {
      notifyError("No items to copy.");
      return;
    }

    const lines = state.mealItems.map((item) => {
      return `${item.food.name} - ${item.grams} g`;
    });

    const totals = `Totals: ${totalCalories.textContent} kcal, ${totalProtein.textContent}, ${totalCarbs.textContent}, ${totalFats.textContent}`;
    const text = [...lines, totals].join("\n");

    navigator.clipboard.writeText(text);
  }

  function bindEvents() {
    addFoodBtn.addEventListener("click", addFoodItem);
    clearMealBtn.addEventListener("click", clearMeal);
    generatePlanBtn.addEventListener("click", generatePlan);
    copyPlanBtn.addEventListener("click", copyPlan);
    calcRecommendation.addEventListener("click", recommendTargets);
    refreshFood.addEventListener("click", loadFoods);
    copySuggestion.addEventListener("click", copySuggestionText);
    copyMealDataBtn.addEventListener("click", copyMealData);
    if (mustUseSearch) {
      mustUseSearch.addEventListener("input", renderPantry);
    }

    scrollButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.querySelector(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });

    mealPresetButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = Number(btn.dataset.meals);
        if (value > 0) mealCount.value = value;
      });
    });
  }

  bindEvents();
  loadFoods();

  // Test hook (used by tests.html)
  window.CalorieLab = {
    generatePlan,
    recommendTargets,
    loadFoods,
    state,
    buildMealPlan, // exposed for unit testing
  };
})();

