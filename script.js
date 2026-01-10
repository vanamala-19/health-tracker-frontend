// =====================

// CONFIG

// =====================

const MODE = "Prod";

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

let calorieChart, proteinChart, weightChart, workoutChart;

// =====================

// HELPERS

// =====================

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");

    return new Date(y, m - 1, d);
  }

  return new Date(dateStr);
}

// =====================

// DIET SUMMARY + CHARTS

// =====================

fetch(`${API_BASE_URL}/summary/`)
  .then((res) => res.json())

  .then((rows) => {
    const daily = rows.map((r) => ({
      date: r[0],

      calories: Number(r[2]) || 0,

      protein: Number(r[3]) || 0,
    }));

    daily.sort((a, b) => parseDate(a.date) - parseDate(b.date)); // Safe updates

    const avgCalEl = document.getElementById("avgCalories");

    if (avgCalEl)
      avgCalEl.innerText = Math.round(
        daily.reduce((s, d) => s + d.calories, 0) / daily.length
      );

    const avgProtEl = document.getElementById("avgProtein");

    if (avgProtEl)
      avgProtEl.innerText = Math.round(
        daily.reduce((s, d) => s + d.protein, 0) / daily.length
      ); // Calories Chart

    if (calorieChart) calorieChart.destroy();

    calorieChart = new Chart(
      document.getElementById("calorieChart"),

      {
        type: "line",

        data: {
          labels: daily.map((d) => d.date),

          datasets: [
            {
              label: "Calories",

              data: daily.map((d) => d.calories),

              tension: 0.3,
            },
          ],
        },
      }
    ); // Protein Chart

    if (proteinChart) proteinChart.destroy();

    proteinChart = new Chart(
      document.getElementById("proteinChart"),

      {
        type: "bar",

        data: {
          labels: daily.map((d) => d.date),

          datasets: [
            {
              label: "Protein (g)",

              data: daily.map((d) => d.protein),
            },
          ],
        },
      }
    );
  });

// =====================

// WEIGHT SUMMARY

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

    const bodyWeightEl = document.getElementById("bodyWeight");

    if (bodyWeightEl) bodyWeightEl.innerText = latest.toFixed(1);

    if (weightChart) weightChart.destroy();

    weightChart = new Chart(
      document.getElementById("weightChart"),

      {
        type: "line",

        data: {
          labels: data.map((d) => d.date),

          datasets: [
            {
              label: "Weight (kg)",

              data: data.map((d) => d.weight),

              tension: 0.3,
            },
          ],
        },

        options: {
          scales: { y: { reverse: true } },
        },
      }
    );
  });

// =====================

// WORKOUT SUMMARY (SETS ONLY)

// =====================

let allWorkoutRows = [];

let workoutMonth = new Date();

function changeWorkoutMonth(delta) {
  workoutMonth.setMonth(workoutMonth.getMonth() + delta);

  renderWorkoutChart();
}

function renderWorkoutChart() {
  const filtered = allWorkoutRows.filter((d) => {
    const dt = parseDate(d.date);

    return (
      dt.getMonth() === workoutMonth.getMonth() &&
      dt.getFullYear() === workoutMonth.getFullYear()
    );
  });

  document.getElementById(
    "workoutTitle"
  ).innerText = `Workout Summary – ${workoutMonth.toLocaleString("default", {
    month: "long",

    year: "numeric",
  })}`;

  if (!filtered.length) {
    if (workoutChart) workoutChart.destroy();

    document.getElementById("wkSets").innerText = "--";

    document.getElementById("workouts").innerText = "0";

    return;
  }

  const workoutDays = filtered.filter((d) => d.sets > 0);

  const avgSets =
    workoutDays.reduce((s, d) => s + d.sets, 0) / (workoutDays.length || 1);

  document.getElementById("wkSets").innerText = Math.round(avgSets);

  document.getElementById("workouts").innerText = workoutDays.length;

  const colors = filtered.map((d) =>
    d.status === "Rest" ? "#f1c40f" : "#2ecc71"
  );

  if (workoutChart) workoutChart.destroy();

  workoutChart = new Chart(document.getElementById("workoutChart"), {
    type: "bar",

    data: {
      labels: filtered.map((d) => d.date),

      datasets: [
        {
          label: "Total Sets",

          data: filtered.map((d) => d.sets),

          backgroundColor: colors,

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

fetch(`${API_BASE_URL}/summary/workout-summary`)
  .then((res) => res.json())

  .then((rows) => {
    allWorkoutRows = rows.map((r) => ({
      date: r[0],

      sets: Number(r[4]) || 0,

      status: r[5],
    }));

    renderWorkoutChart();
  });
