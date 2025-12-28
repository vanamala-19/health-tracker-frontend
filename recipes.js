// =====================
// CONFIG
// =====================
const API_BASE = "https://health-tracker-backend-z131.onrender.com";

// =====================
// STATE
// =====================
let recipes = [];
let currentRecipe = null;
let cards = [];
let currentIndex = 0;

// =====================
// HELPERS
// =====================
const qs = (id) => document.getElementById(id);
const clear = (el) => (el.innerHTML = "");

// =====================
// LOAD RECIPE LIST
// =====================
async function loadRecipes() {
  const res = await fetch(`${API_BASE}/recipes`);
  recipes = await res.json();

  const list = qs("recipeList");
  clear(list);

  recipes.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "recipe-btn";
    btn.innerText = `${r.name} • ${r.caloriesPerServing} kcal`;
    btn.onclick = () => loadRecipe(r.id);
    list.appendChild(btn);
  });
}

// =====================
// LOAD SINGLE RECIPE
// =====================
async function loadRecipe(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}`);
  const data = await res.json();

  currentRecipe = data.recipe;
  cards = data.cards || [];
  currentIndex = 0;

  qs("recipeTitle").innerText = currentRecipe.name;
  qs("recipeMeta").innerText =
    `${currentRecipe.category} • ${currentRecipe.servings} servings • ` +
    `${currentRecipe.caloriesPerServing} kcal/serving`;

  // 🔥 INSERT INGREDIENTS AS FIRST CARD
  if (data.ingredients && data.ingredients.length) {
    cards.unshift({
      type: "ingredients",
      title: "Ingredients",
      ingredients: data.ingredients,
    });
  }

  qs("cardContainer").style.display = "block";
  renderCard();
}

// =====================
// RENDER CARD
// =====================
function renderCard() {
  const card = cards[currentIndex];
  const el = qs("card");

  el.className = `recipe-card ${card.type || "info"}`;

  let html = `<h3>${card.title}</h3>`;

  // ✅ INGREDIENTS CARD
  if (card.type === "ingredients") {
    html += `<ul class="ingredient-list">`;
    card.ingredients.forEach((i) => {
      const name = i.itemName || i.item || "Item";
      html += `<li>${name} – ${i.quantity} ${i.unit}</li>`;
    });
    html += `</ul>`;
  }

  // ✅ NORMAL STEP CARD
  else {
    html += `<p>${card.instruction}</p>`;

    if (card.flame || card.time) {
      html += `<div class="cook-meta">`;
      if (card.flame) html += `<span>🔥 ${card.flame}</span>`;
      if (card.time) html += `<span>⏱ ${card.time} min</span>`;
      html += `</div>`;
    }

    if (card.type === "log") {
      html += `
        <button class="btn" onclick="addToDietLog()">
          ➕ Add to Diet Log
        </button>
      `;
    }
  }

  el.innerHTML = html;
  qs("progress").innerText = `${currentIndex + 1} / ${cards.length}`;
}

// =====================
// NAVIGATION
// =====================
function nextCard() {
  if (currentIndex < cards.length - 1) {
    currentIndex++;
    renderCard();
  }
}

function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCard();
  }
}

// =====================
// SWIPE SUPPORT
// =====================
let startX = 0;

qs("card").addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

qs("card").addEventListener("touchend", (e) => {
  const diff = e.changedTouches[0].clientX - startX;
  if (diff < -40) nextCard();
  if (diff > 40) prevCard();
});

// =====================
// ADD TO DIET LOG
// =====================
async function addToDietLog() {
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    date: today,
    mealType: "Meal",
    context: "Recipe",
    proteinSource: currentRecipe.name,
    portionNotes: "Cooked from recipe",
    notes: currentRecipe.notes || "",
    calories: currentRecipe.caloriesPerServing,
    protein: "",
    carbs: "",
    fats: "",
  };

  await fetch(`${API_BASE}/diet-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  alert("✅ Added to diet log");
}

// =====================
// INIT
// =====================
loadRecipes();
