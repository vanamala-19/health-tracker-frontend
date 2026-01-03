const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "index.html", icon: "🏠" },
  { id: "diet", label: "Diet", href: "diet.html", icon: "🥗" },
  { id: "meal-builder", label: "Meal", href: "meal-builder.html", icon: "🍱" },
  { id: "inventory", label: "Inventory", href: "inventory.html", icon: "📦" },
  { id: "recipes", label: "Recipes", href: "recipes.html", icon: "🍳" },
  { id: "shift", label: "Shift", href: "shift.html", icon: "🕒" },
];

function loadNav() {
  const container = document.getElementById("app-nav");
  if (!container) return;

  const current = location.pathname.split("/").pop();

  /* ---------- DESKTOP NAV ---------- */
  let desktop = `<nav class="nav desktop-nav">`;
  NAV_ITEMS.forEach((n) => {
    const active = current === n.href ? "active" : "";
    desktop += `<a href="${n.href}" class="${active}">${n.label}</a>`;
  });
  desktop += `</nav>`;

  /* ---------- MOBILE BOTTOM NAV ---------- */
  let mobile = `<nav class="mobile-nav">`;
  NAV_ITEMS.forEach((n) => {
    const active = current === n.href ? "active" : "";
    mobile += `
      <a href="${n.href}" class="${active}">
        <span class="icon">${n.icon}</span>
        <span class="label">${n.label}</span>
      </a>
    `;
  });
  mobile += `</nav>`;

  container.innerHTML = desktop + mobile;
}

loadNav();
