// =====================
// CONFIG
// =====================
// API_BASE_URL is loaded from api-config.js

let calorieChart, proteinChart, weightChart;
let allDietDaily = [];
let allWorkoutRows = [];
let dietMonth = new Date();
let workoutMonth = new Date();
let selectedWorkoutDateKey = null;

// =====================
// HELPERS
// =====================
function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isDoneWorkout(status, sets) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (
    [
      "workout",
      "done",
      "gym",
      "yes",
      "completed",
      "workout completed",
    ].includes(s)
  )
    return true;
  if (["rest", "skip", "skipped", "no", "cancelled"].includes(s)) return false;
  return Number(sets) > 0;
}

function isSameDay(a, b) {
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun → 6 Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  return start;
}

function toYmd(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const parseDate = parseSheetDate;

// =====================
// TODAY STATS (FIXED)
// =====================
function renderTodayStats() {
  const Today = new Date();

  const todayRows = allDietDaily.filter((d) => {
    const rowDate = parseDate(d.date);
    return isSameDay(rowDate, new Date(Today));
  });

  const todayCalories = todayRows.reduce((s, d) => s + d.calories, 0);
  // console.log(Today, todayRows, todayCalories, allDietDaily);
  const todayProtein = todayRows.reduce((s, d) => s + d.protein, 0);

  const calorieLimit = 1800;

  const today = new Date();
  const proteinMin = isWeekend(today) ? 80 : 100;
  const proteinMax = isWeekend(today) ? 100 : 120;

  const calEl = document.getElementById("todayCalories");
  const protEl = document.getElementById("todayProtein");
  const protRangeEl = document.getElementById("proteinRange");
  const calBar = document.getElementById("calorieProgress");
  const protBar = document.getElementById("proteinProgress");

  if (!calEl || !protEl || !calBar || !protBar) return;

  calEl.innerText = `${todayCalories} / ${calorieLimit}`;
  protEl.innerText = `${todayProtein} / ${proteinMax}`;

  protRangeEl.innerText = isWeekend(today)
    ? "Weekend target: 80–100 g"
    : "Weekday target: 100–120 g";

  calBar.style.width = `${Math.min(
    (todayCalories / calorieLimit) * 100,
    100,
  )}%`;

  protBar.style.width = `${Math.min((todayProtein / proteinMax) * 100, 100)}%`;
}

// =====================
// WEEKLY WORKOUT COUNT (FIXED)
// =====================
function renderWeeklyWorkouts() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const workoutDays = new Set();

  allWorkoutRows.forEach((w) => {
    const d = parseDate(w.date);
    d.setHours(0, 0, 0, 0);

    if (d >= weekStart && d <= weekEnd && w.done) {
      workoutDays.add(w.date);
    }
  });

  const el = document.getElementById("workouts");
  if (el) el.innerText = `${workoutDays.size} / 5`;
}

// =====================
// DIET DATA + CHARTS
// =====================
function applyDietSummaryRows(rows) {
  allDietDaily = (rows || []).map((r) => ({
    date: r[0],
    calories: Number(r[2]) || 0,
    protein: Number(r[3]) || 0,
  }));

  allDietDaily.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  renderDietChart();
  renderTodayStats();
}

// =====================
// DIET MONTH NAV
// =====================
function changeDietMonth(delta) {
  dietMonth.setMonth(dietMonth.getMonth() + delta);
  renderDietChart();
}

function renderDietChart() {
  const filtered = allDietDaily.filter((d) => {
    const dt = parseDate(d.date);
    return (
      dt.getMonth() === dietMonth.getMonth() &&
      dt.getFullYear() === dietMonth.getFullYear()
    );
  });

  const title = document.getElementById("dietMonthTitle");
  if (title) {
    title.innerText = dietMonth.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }

  if (!filtered.length) {
    if (calorieChart) calorieChart.destroy();
    if (proteinChart) proteinChart.destroy();
    return;
  }

  const calorieCanvas = document.getElementById("calorieChart");

  if (calorieChart) calorieChart.destroy();
  calorieChart = new Chart(calorieCanvas, {
    type: "line",
    data: {
      labels: filtered.map((d) => formatDateDDMMYY(d.date)),
      datasets: [
        {
          label: "Calories (kcal)",
          data: filtered.map((d) => d.calories),
          tension: 0.25,
          fill: false,
          borderColor: "#22c55e",
          borderWidth: 2,
          pointRadius: 1.5,
          pointHoverRadius: 4,
          pointBackgroundColor: "#22c55e",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${context.parsed.y} kcal`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback(value) {
              return `${value}`;
            },
          },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
      },
    },
  });

  const proteinCanvas = document.getElementById("proteinChart");
  const proteinCtx = proteinCanvas?.getContext("2d");
  const proteinGradient = proteinCtx
    ? (() => {
        const g = proteinCtx.createLinearGradient(0, 0, 0, proteinCanvas.height || 260);
        g.addColorStop(0, "rgba(59, 130, 246, 0.9)");
        g.addColorStop(1, "rgba(59, 130, 246, 0.55)");
        return g;
      })()
    : "rgba(59, 130, 246, 0.75)";

  if (proteinChart) proteinChart.destroy();
  proteinChart = new Chart(proteinCanvas, {
    type: "bar",
    data: {
      labels: filtered.map((d) => formatDateDDMMYY(d.date)),
      datasets: [
        {
          label: "Protein (g)",
          data: filtered.map((d) => d.protein),
          backgroundColor: proteinGradient,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${context.parsed.y} g`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.18)" },
        },
      },
    },
  });
}

// =====================
// WEIGHT SUMMARY (UNCHANGED)
// =====================
function applyWeightSummaryRows(rows) {
  const data = (rows || []).map((r) => ({
    date: r[0],
    weight: Number(r[1]),
  }));

  data.sort((a, b) => parseDate(a.date) - parseDate(b.date));

  const latest = data[data.length - 1]?.weight;
  if (!latest) return;

  const el = document.getElementById("bodyWeight");
  if (el) el.innerText = latest.toFixed(1);
}

// =====================
// WORKOUT SUMMARY
// =====================
async function loadWorkoutSummary() {
  try {
    const rows = await safeApiFetch(`${API_BASE_URL}/summary/workout-summary`);
    allWorkoutRows = rows.map((r) => ({
      date: r[0],
      // New schema: [date, status]
      // Backward compatibility: older rows may still have sets/status at [4]/[5]
      sets: Number(r[4]) || 0,
      status: r[1] ?? r[5] ?? "",
      done: isDoneWorkout(r[1] ?? r[5] ?? "", Number(r[4]) || 0),
    }));

    renderWorkoutChart();
    renderWeeklyWorkouts();
  } catch (error) {
    console.error("Failed to load workout data:", error);
  }
}

function applyWorkoutSummaryRows(rows) {
  allWorkoutRows = (rows || []).map((r) => ({
    date: r[0],
    sets: Number(r[4]) || 0,
    status: r[1] ?? r[5] ?? "",
    done: isDoneWorkout(r[1] ?? r[5] ?? "", Number(r[4]) || 0),
  }));

  renderWorkoutChart();
  renderWeeklyWorkouts();
}

async function loadDashboardBundle() {
  try {
    LoadingState.showOverlay();
    const bundle = await safeApiFetch(`${API_BASE_URL}/summary/dashboard`);
    applyDietSummaryRows(bundle?.dietDaily || []);
    applyWeightSummaryRows(bundle?.weight || []);
    applyWorkoutSummaryRows(bundle?.workoutSummary || []);
  } catch (error) {
    console.error("Failed to load dashboard bundle:", error);
  } finally {
    LoadingState.hideOverlay();
  }
}

async function saveWorkoutStatus() {
  const dateInput = document.getElementById("workoutDate");
  const statusInput = document.getElementById("workoutStatus");
  const date = dateInput?.value;
  const status = statusInput?.value;

  if (!date) {
    notifyError("Select a date");
    return;
  }

  try {
    selectedWorkoutDateKey = date;
    const isDone = String(status || "").toLowerCase() === "done";
    await safeApiFetch(`${API_BASE_URL}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // New simple API fields
        date,
        status,
        // Backward-compatible fields for older backend deployments
        start_time: "00:00",
        end_time: "00:01",
        activity_type: isDone ? "Workout" : "Rest",
        workout_name: isDone ? "Gym" : "Skipped",
        duration_min: isDone ? 1 : 0,
        source_app: "web-dashboard",
      }),
    });
    notifySuccess(`Gym status saved: ${status}`);
    await loadWorkoutSummary();
  } catch (error) {
    console.error("Failed to save workout status:", error);
  }
}

const workoutDateInput = document.getElementById("workoutDate");
if (workoutDateInput && !workoutDateInput.value) {
  workoutDateInput.value = toYmd(new Date());
}

async function initDashboard() {
  try {
    if (typeof waitForBackendWake === "function") {
      await waitForBackendWake();
    }
  } catch (error) {
    console.warn("Backend wake check failed, continuing with normal fetch flow", error);
  }

  await loadDashboardBundle();
}

initDashboard();

function changeWorkoutMonth(delta) {
  workoutMonth.setMonth(workoutMonth.getMonth() + delta);
  renderWorkoutChart();
  renderWeeklyWorkouts();
}

function renderWorkoutChart() {
  const currentMonth = workoutMonth.getMonth();
  const currentYear = workoutMonth.getFullYear();
  const filtered = allWorkoutRows.filter((d) => {
    const dt = parseDate(d.date);
    return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
  });

  const title = document.getElementById("workoutTitle");
  if (title) {
    const month = workoutMonth
      .toLocaleString("default", { month: "short" })
      .toUpperCase();
    title.innerText = `Workout Summary - ${month} ${workoutMonth.getFullYear()}`;
  }

  const heatmap = document.getElementById("workoutHeatmap");
  if (!heatmap) return;

  const dateInput = document.getElementById("workoutDate");
  if (dateInput?.value) {
    selectedWorkoutDateKey = dateInput.value;
  }

  heatmap.innerHTML = "";

  if (!filtered.length) {
    const wkEl = document.getElementById("wkSets");
    if (wkEl) wkEl.innerText = "--";
    return;
  }

  const normalized = filtered
    .map((d) => {
      const parsed = parseDate(d.date);
      return {
        ...d,
        key: toYmd(parsed),
      };
    })
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  const statusByDate = new Map();
  normalized.forEach((d) => {
    statusByDate.set(d.key, d.done ? "done" : "rest");
  });

  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const gridStart = new Date(firstOfMonth);
  const startDay = gridStart.getDay(); // Sun=0
  const startOffset = startDay === 0 ? 6 : startDay - 1; // make Monday start
  gridStart.setDate(gridStart.getDate() - startOffset);

  const gridEnd = new Date(lastOfMonth);
  const endDay = gridEnd.getDay();
  const endOffset = endDay === 0 ? 0 : 7 - endDay;
  gridEnd.setDate(gridEnd.getDate() + endOffset);

  for (let dt = new Date(gridStart); dt <= gridEnd; dt.setDate(dt.getDate() + 1)) {
    const key = toYmd(dt);
    const status = statusByDate.get(key) || "none";
    const inMonth = dt.getMonth() === currentMonth;

    const cell = document.createElement("div");
    cell.className = `heat-cell level-${status}${inMonth ? "" : " outside-month"}`;
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.dataset.date = key;
    if (selectedWorkoutDateKey === key) {
      cell.classList.add("selected");
    }

    if (isSameDay(new Date(dt), new Date())) {
      cell.className += " today";
    }

    const statusText =
      status === "done" ? "Done" : status === "rest" ? "Skipped" : "No entry";
    cell.title = `${formatDateDDMMYY(key)} • ${statusText}`;
    cell.setAttribute(
      "aria-label",
      `${formatDateDDMMYY(key)}, ${statusText}. Press Enter to select date`,
    );
    cell.textContent = String(dt.getDate()).padStart(2, "0");
    const activateCell = () => {
      selectedWorkoutDateKey = key;
      if (dateInput) dateInput.value = key;
      const statusInput = document.getElementById("workoutStatus");
      if (statusInput) {
        if (status === "done") statusInput.value = "Done";
        else if (status === "rest") statusInput.value = "Skipped";
      }
      heatmap.querySelectorAll(".heat-cell").forEach((el) => {
        el.classList.toggle("selected", el.dataset.date === key);
      });
    };
    cell.addEventListener("click", activateCell);
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateCell();
      }
    });
    heatmap.appendChild(cell);
  }

  const doneDays = new Set(
    normalized.filter((d) => d.done).map((d) => d.key),
  ).size;
  const wkEl = document.getElementById("wkSets");
  if (wkEl) wkEl.innerText = `${doneDays} done`;
}
