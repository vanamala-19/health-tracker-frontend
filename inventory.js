const API_BASE_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

let inventory = [];
let sortAsc = true;

const tbody = document.querySelector("#inventoryTable tbody");
const form = document.getElementById("inventoryForm");

// ---------------- LOAD INVENTORY ----------------
async function loadInventory() {
  const res = await fetch(`${API_BASE_URL}/inventory`);
  inventory = await res.json();
  renderTable();
}

// ---------------- RENDER TABLE ----------------
function renderTable() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("filterCategory").value;

  tbody.innerHTML = "";

  inventory
    .filter(
      (r) =>
        (!search || (r[0] || "").toLowerCase().includes(search)) &&
        (!category || r[1] === category)
    )
    .forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r[0] || ""}</td>
        <td>${r[1] || ""}</td>
        <td>${r[2] || 0}</td>
        <td>${r[3] || ""}</td>
        <td>${r[4] || 0}</td>
        <td>${r[5] || 0}</td>
        <td>${r[6] || 0}</td>
        <td>${r[7] || 0}</td>
        <td>
          <button onclick="editItem(${i})">✏️</button>
          <button onclick="deleteItem(${i})">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// ---------------- SORT ----------------
function sortByName() {
  inventory.sort((a, b) =>
    sortAsc
      ? (a[0] || "").localeCompare(b[0] || "")
      : (b[0] || "").localeCompare(a[0] || "")
  );
  sortAsc = !sortAsc;
  renderTable();
}

// ---------------- EDIT ----------------
function editItem(index) {
  const r = inventory[index];

  document.getElementById("itemName").value = r[0] || "";
  document.getElementById("category").value = r[1] || "";
  document.getElementById("quantity").value = r[2] || "";
  document.getElementById("unit").value = r[3] || "";
  document.getElementById("calories").value = r[4] || "";
  document.getElementById("protein").value = r[5] || "";
  document.getElementById("carbs").value = r[6] || "";
  document.getElementById("fats").value = r[7] || "";
  document.getElementById("notes").value = r[8] || "";

  document.getElementById("editRow").value = index + 2; // sheet row
  document.getElementById("formTitle").innerText = "Edit Item";
}

// ---------------- DELETE ----------------
async function deleteItem(index) {
  if (!confirm("Delete this item?")) return;

  await fetch(`${API_BASE_URL}/inventory/${index + 2}`, {
    method: "DELETE",
  });

  loadInventory();
}

// ---------------- SAVE (ADD / UPDATE) ----------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: document.getElementById("itemName").value.trim(),
    category: document.getElementById("category").value,
    quantity: document.getElementById("quantity").value,
    unit: document.getElementById("unit").value,
    calories: document.getElementById("calories").value,
    protein: document.getElementById("protein").value,
    carbs: document.getElementById("carbs").value,
    fats: document.getElementById("fats").value,
    notes: document.getElementById("notes").value,
  };

  if (!payload.name) {
    alert("Item name is required");
    return;
  }

  const editRow = document.getElementById("editRow").value;

  if (editRow) {
    await fetch(`${API_BASE_URL}/inventory/${editRow}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: [
          payload.name,
          payload.category,
          payload.quantity,
          payload.unit,
          payload.calories,
          payload.protein,
          payload.carbs,
          payload.fats,
          payload.notes,
        ],
      }),
    });
  } else {
    await fetch(`${API_BASE_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  form.reset();
  document.getElementById("editRow").value = "";
  document.getElementById("formTitle").innerText = "Add Item";
  loadInventory();
});

// ---------------- INIT ----------------
document.getElementById("searchInput").oninput = renderTable;
document.getElementById("filterCategory").onchange = renderTable;

loadInventory();
