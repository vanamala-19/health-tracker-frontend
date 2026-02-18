const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "index.html",
    iconClass: "fas fa-home",
  },
  {
    id: "diet",
    label: "Diet",
    href: "diet.html",
    iconClass: "fas fa-utensils",
  },
  {
    id: "meal-builder",
    label: "Meal",
    href: "meal-builder.html",
    iconClass: "fas fa-box-open",
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "inventory.html",
    iconClass: "fas fa-warehouse",
  },
  {
    id: "recipes",
    label: "Recipes",
    href: "recipes.html",
    iconClass: "fas fa-book-open",
  },
  {
    id: "shift",
    label: "Shift",
    href: "shift.html",
    iconClass: "fas fa-clock",
  },
];

function loadNav() {
  const container = document.getElementById("app-nav");
  if (!container) return;

  const current = location.pathname.split("/").pop();

  /* ---------- DESKTOP NAV ---------- */
  let desktop = `<nav class="nav desktop-nav">`;
  NAV_ITEMS.forEach((n) => {
    const active = current === n.href ? "active" : "";
    desktop += `<a href="${n.href}" class="${active}"><i class="${n.iconClass} icon"></i> ${n.label}</a>`;
  });
  desktop += `<button id="darkModeToggleBtn" class="btn-theme-toggle" onclick="DarkMode.toggle()" title="Toggle dark mode"><i class="fas fa-moon"></i> Dark</button>`;
  desktop += `</nav>`;

  /* ---------- MOBILE BOTTOM NAV ---------- */
  let mobile = `<nav class="mobile-nav">`;
  NAV_ITEMS.forEach((n) => {
    const active = current === n.href ? "active" : "";
    mobile += `
      <a href="${n.href}" class="${active}">
        <i class="${n.iconClass} icon"></i>
        <span class="label">${n.label}</span>
      </a>
    `;
  });
  mobile += `<button id="darkModeToggleBtnMobile" class="btn-theme-toggle" onclick="DarkMode.toggle()" title="Toggle dark mode"><i class="fas fa-moon"></i></button>`;
  mobile += `</nav>`;

  container.innerHTML = desktop + mobile;

  // Update button text after rendering
  if (typeof DarkMode !== "undefined") {
    DarkMode.updateToggleButton();
  }
}

loadNav();
