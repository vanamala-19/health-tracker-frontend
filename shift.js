const API = "https://health-tracker-backend-z131.onrender.com";

let allRows = [];
let currentRowNumber = null;

/* =====================
   LOAD SHIFT LOG
===================== */
async function loadShiftLog() {
  const res = await fetch(`${API}/shift-log`);
  allRows = await res.json();
  renderTable(allRows);
}

loadShiftLog();

/* =====================
   DATE FILTER
===================== */
document.getElementById("dateFilter").addEventListener("change", (e) => {
  const selected = e.target.value;
  if (!selected) return;

  const index = allRows.findIndex((r) => normalizeDate(r[0]) === selected);

  if (index === -1) {
    alert("No entry found for this date");
    return;
  }

  currentRowNumber = index + 2; // Google Sheet row number
  populateEditCard(allRows[index]);
});

/* =====================
   POPULATE EDIT FORM
===================== */
function populateEditCard(row) {
  document.getElementById("editCard").style.display = "block";
  document.getElementById("editDateTitle").innerText = `Edit ${row[0]}`;

  document.getElementById("shift").value = row[3] || "";
  document.getElementById("workMode").value = row[4] || "";
  document.getElementById("anchorHit").value = row[8] || "";
  document.getElementById("gymDone").value = row[9] || "";
  document.getElementById("notes").value = row[12] || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =====================
   SAVE EDIT (✔ SAFE)
===================== */
async function saveEdit() {
  if (!currentRowNumber) return;

  const payload = {
    shift: document.getElementById("shift").value,
    workMode: document.getElementById("workMode").value,
    anchorHit: document.getElementById("anchorHit").value,
    gymDone: document.getElementById("gymDone").value,
    notes: document.getElementById("notes").value,
  };

  await fetch(`${API}/shift-log/${currentRowNumber}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  alert("✅ Updated successfully");
  document.getElementById("editCard").style.display = "none";
  currentRowNumber = null;
  loadShiftLog();
}

/* =====================
   TABLE VIEW
===================== */
function renderTable(rows) {
  let html = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Shift</th>
      <th>Work Mode</th>
      <th>Protein Target</th>
      <th>Anchor Hit</th>
      <th>Gym</th>
      <th>Status</th>
    </tr>
  `;

  rows.forEach((r) => {
    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[3]}</td>
        <td>${r[4]}</td>
        <td><strong>${r[7]}</strong> g</td>
        <td>${r[8]}</td>
        <td>${r[9]}</td>
        <td>${r[11]}</td>
      </tr>
    `;
  });

  document.getElementById("shiftTable").innerHTML = html;
}

/* =====================
   DATE NORMALIZER
===================== */
function normalizeDate(d) {
  if (!d) return "";
  if (d.includes("-")) return d;

  const [day, month, year] = d.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
