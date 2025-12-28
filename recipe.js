const API = "https://health-tracker-backend-z131.onrender.com";
const RECIPE_ID = "methi-chicken";

let cards = [];
let currentIndex = 0;

async function loadRecipe() {
  const res = await fetch(`${API}/recipes/${RECIPE_ID}`);
  const data = await res.json();

  document.getElementById("recipeTitle").innerText = data.recipe.name;

  // INGREDIENTS CARD
  cards.push({
    type: "ingredients",
    title: "Ingredients",
    ingredients: data.ingredients,
  });

  // STEP CARDS
  data.cards.forEach((c) => cards.push(c));

  renderCards();
  attachSwipe();
}

function renderCards() {
  const track = document.getElementById("cardTrack");
  track.innerHTML = "";

  cards.forEach((c) => {
    const el = document.createElement("div");
    el.className = `recipe-card ${c.type || "info"}`;

    let html = `<h2>${c.title}</h2>`;

    if (c.type === "ingredients") {
      html += `<ul>`;
      c.ingredients.forEach((i) => {
        const name = i.itemName || i.item;
        html += `<li>${name} – ${i.quantity} ${i.unit}</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p>${c.instruction}</p>`;
      if (c.flame) html += `<p>🔥 ${c.flame}</p>`;
      if (c.time) html += `<p>⏱ ${c.time} min</p>`;
    }

    el.innerHTML = html;
    track.appendChild(el);
  });

  updatePosition();
}

function updatePosition() {
  document.getElementById("cardTrack").style.transform = `translateX(-${
    currentIndex * 100
  }%)`;
}

function attachSwipe() {
  let startX = 0;
  const container = document.querySelector(".card-container");

  container.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  container.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (diff < -50 && currentIndex < cards.length - 1) currentIndex++;
    if (diff > 50 && currentIndex > 0) currentIndex--;
    updatePosition();
  });
}

loadRecipe();
