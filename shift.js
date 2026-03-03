// =====================
// CONFIG
// =====================
// API_BASE_URL is loaded from api-config.js
const API = API_BASE_URL;
const SHIFT_ADMIN_MODE =
  new URLSearchParams(window.location.search).get("admin") === "1";

let allRows = [];
let currentRowNumber = null;

function setupArchivedMode() {
  const container = document.querySelector(".container");
  if (!container) return;

  const note = document.createElement("section");
  note.className = "card";
  if (SHIFT_ADMIN_MODE) {
    note.innerHTML = `
      <h3>Admin Edit Mode Enabled</h3>
      <p class="muted">Shift updates are enabled for this session.</p>
    `;
  } else {
    note.innerHTML = `
      <h3>Shift Is Archived</h3>
      <p class="muted">This page is admin-only. To enable edits, use <code>?admin=1</code>.</p>
    `;
  }
  container.insertBefore(note, container.children[1] || null);

  if (SHIFT_ADMIN_MODE) return;

  const editCard = document.getElementById("editCard");
  if (editCard) editCard.style.display = "none";

  const dateFilter = document.getElementById("dateFilter");
  if (dateFilter) dateFilter.disabled = true;

  const saveBtn = document.querySelector('button[onclick="saveEdit()"]');
  if (saveBtn) saveBtn.disabled = true;
}

/* =====================
   LOAD SHIFT LOG
===================== */
async function loadShiftLog() {
  try {
    LoadingState.showOverlay();
    const rows = await safeApiFetch(`${API}/shift-log`);
    allRows = rows.map((r, i) => ({
      row: Array.isArray(r) ? i + 2 : r.row ?? i + 2,
      values: Array.isArray(r) ? r : r.values || [],
    }));
    renderTable(allRows);
  } catch (error) {
    console.error("Failed to load shift log:", error);
  } finally {
    LoadingState.hideOverlay();
  }
}

loadShiftLog();
setupArchivedMode();

/* =====================
   DATE FILTER
===================== */
document.getElementById("dateFilter").addEventListener("change", (e) => {
  if (!SHIFT_ADMIN_MODE) {
    notifyWarning("Shift edit mode is disabled.");
    return;
  }

  const selected = e.target.value;
  if (!selected) return;

  const index = allRows.findIndex(
    (r) => normalizeSheetDateISO(r.values[0]) === selected,
  );

  if (index === -1) {
    notifyError("No entry found for this date");
    return;
  }

  currentRowNumber = allRows[index].row ?? index + 2; // Google Sheet row number
  populateEditCard(allRows[index].values);
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
  if (!SHIFT_ADMIN_MODE) {
    notifyWarning("Shift edit mode is disabled.");
    return;
  }

  if (!currentRowNumber) return;

  // Validate form before submission
  const formData = {
    shift: document.getElementById("shift").value,
    workMode: document.getElementById("workMode").value,
  };

  if (!validateShiftForm(formData)) {
    return;
  }

  const saveBtn = document.querySelector('button[onclick="saveEdit()"]');

  try {
    if (saveBtn) LoadingState.disableButton(saveBtn);

    const payload = {
      shift: document.getElementById("shift").value,
      workMode: document.getElementById("workMode").value,
      anchorHit: document.getElementById("anchorHit").value,
      gymDone: document.getElementById("gymDone").value,
      notes: document.getElementById("notes").value,
    };

    await safeApiFetch(`${API}/shift-log/${currentRowNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showSuccessMessage("✅ Shift log updated successfully");
    document.getElementById("editCard").style.display = "none";
    currentRowNumber = null;
    loadShiftLog();
  } catch (error) {
    console.error("Failed to save shift log:", error);
  } finally {
    if (saveBtn) LoadingState.enableButton(saveBtn);
  }
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
    const v = r.values || [];
    if (!v[0]) return; // Skip empty rows
    html += `
      <tr>
        <td data-label="Date">${v[0]}</td>
        <td data-label="Day">${v[1]}</td>
        <td data-label="Shift">${v[3]}</td>
        <td data-label="Work Mode">${v[4]}</td>
        <td data-label="Protein Target"><strong>${v[7]}</strong> g</td>
        <td data-label="Anchor Hit">${v[8]}</td>
        <td data-label="Gym">${v[9]}</td>
        <td data-label="Status">${v[11]}</td>
      </tr>
    `;
  });

  document.getElementById("shiftTable").innerHTML = html;
}

