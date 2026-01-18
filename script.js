// =====================
// CONFIG
// =====================
const MODE = "Prod";

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

let calorieChart, proteinChart, weightChart, workoutChart;
let allDietDaily = [];
let allWorkoutRows = [];
let dietMonth = new Date();
let workoutMonth = new Date();

// =====================
// HELPERS
// =====================
function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return new Date(y, m - 1, d);
  }

  return new Date(dateStr);
}

// =====================
// TODAY STATS (FIXED)
// =====================
function renderTodayStats() {
  const todayISO = new Date().toISOString().slice(0, 10);

  const todayRows = allDietDaily.filter((d) => {
    const rowDate = parseDate(d.date).toISOString().slice(0, 10);
    return rowDate === todayISO;
  });

  const todayCalories = todayRows.reduce((s, d) => s + d.calories, 0);
  console.log(todayISO, todayRows, todayCalories);
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
    100
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

  const workoutDays = new Set();

  allWorkoutRows.forEach((w) => {
    const d = parseDate(w.date);
    if (d >= weekStart && d <= weekEnd && w.sets > 0) {
      workoutDays.add(w.date);
    }
  });

  const el = document.getElementById("workouts");
  if (el) el.innerText = `${workoutDays.size} / 5`;
}

// =====================
// DIET DATA + CHARTS
// =====================
fetch(`${API_BASE_URL}/summary/`)
  .then((res) => res.json())
  .then((rows) => {
    allDietDaily = rows.map((r) => ({
      date: r[0],
      calories: Number(r[2]) || 0,
      protein: Number(r[3]) || 0,
    }));

    allDietDaily.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    renderDietChart();
    renderTodayStats();
  });

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

  if (calorieChart) calorieChart.destroy();
  calorieChart = new Chart(document.getElementById("calorieChart"), {
    type: "line",
    data: {
      labels: filtered.map((d) => d.date),
      datasets: [
        {
          label: "Calories",
          data: filtered.map((d) => d.calories),
          tension: 0.3,
        },
      ],
    },
  });

  if (proteinChart) proteinChart.destroy();
  proteinChart = new Chart(document.getElementById("proteinChart"), {
    type: "bar",
    data: {
      labels: filtered.map((d) => d.date),
      datasets: [
        {
          label: "Protein (g)",
          data: filtered.map((d) => d.protein),
        },
      ],
    },
  });
}

// =====================
// WEIGHT SUMMARY (UNCHANGED)
// =====================
fetch(`${API_BASE_URL}/summary/weight`)
  .then((res) => res.json())
  .then((rows) => {
    const data = rows.map((r) => ({
      date: r[0],
      weight: Number(r[1]),
    }));

    data.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const latest = data[data.length - 1]?.weight;
    if (!latest) return;

    const el = document.getElementById("bodyWeight");
    if (el) el.innerText = latest.toFixed(1);
  });

// =====================
// WORKOUT SUMMARY
// =====================
fetch(`${API_BASE_URL}/summary/workout-summary`)
  .then((res) => res.json())
  .then((rows) => {
    allWorkoutRows = rows.map((r) => ({
      date: r[0],
      sets: Number(r[4]) || 0,
      status: r[5],
    }));

    renderWorkoutChart();
    renderWeeklyWorkouts();
  });

function changeWorkoutMonth(delta) {
  workoutMonth.setMonth(workoutMonth.getMonth() + delta);
  renderWorkoutChart();
  renderWeeklyWorkouts();
}

function renderWorkoutChart() {
  const filtered = allWorkoutRows.filter((d) => {
    const dt = parseDate(d.date);
    return (
      dt.getMonth() === workoutMonth.getMonth() &&
      dt.getFullYear() === workoutMonth.getFullYear()
    );
  });

  const title = document.getElementById("workoutTitle");
  if (title) {
    title.innerText = `Workout Summary – ${workoutMonth.toLocaleString(
      "default",
      { month: "long", year: "numeric" }
    )}`;
  }

  if (!filtered.length) {
    if (workoutChart) workoutChart.destroy();
    return;
  }

  if (workoutChart) workoutChart.destroy();
  workoutChart = new Chart(document.getElementById("workoutChart"), {
    type: "bar",
    data: {
      labels: filtered.map((d) => d.date),
      datasets: [
        {
          label: "Total Sets",
          data: filtered.map((d) => d.sets),
          backgroundColor: filtered.map((d) =>
            d.status === "Rest" ? "#f1c40f" : "#2ecc71"
          ),
          borderRadius: 6,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
