// =====================
// CONFIG
// =====================
const MODE = "Prod"; // change to "prod" when deploying

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

const START_WEIGHT = 83;
const GOAL_WEIGHT = 67;

let calorieChart, proteinChart, weightChart, workoutChart;

// ---------- HELPERS ----------
function parseDate(d) {
  return new Date(d.split("/").reverse().join("-"));
}

function isCurrentMonth(dateStr) {
  const d = parseDate(dateStr);
  const now = new Date();
  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function calculateProteinStreak(daily, target = 80) {
  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].protein >= target) streak++;
    else break;
  }
  return streak;
}

// ---------- DIET SUMMARY ----------
fetch(`${API_BASE_URL}/summary`)
  .then((res) => res.json())
  .then((rows) => {
    const daily = rows.map((r) => ({
      date: r[0],
      day: r[1],
      calories: Number(r[2]),
      protein: Number(r[3]),
      meals: Number(r[4]),
    }));

    daily.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const avgCalories = Math.round(
      daily.reduce((s, d) => s + d.calories, 0) / daily.length
    );
    const avgProtein = Math.round(
      daily.reduce((s, d) => s + d.protein, 0) / daily.length
    );

    document.getElementById("avgCalories").innerText = avgCalories;
    document.getElementById("avgProtein").innerText = avgProtein;

    const streak = calculateProteinStreak(daily);
    const streakEl = document.getElementById("proteinStreak");
    streakEl.innerText = `${streak} days`;
    streakEl.style.color =
      streak >= 3 ? "#27ae60" : streak >= 1 ? "#f39c12" : "#e74c3c";

    if (calorieChart) calorieChart.destroy();
    calorieChart = new Chart(
      (calorieChartCanvas = document.getElementById("calorieChart")),
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
    );

    if (proteinChart) proteinChart.destroy();
    proteinChart = new Chart(document.getElementById("proteinChart"), {
      type: "bar",
      data: {
        labels: daily.map((d) => d.date),
        datasets: [{ label: "Protein (g)", data: daily.map((d) => d.protein) }],
      },
    });
  });

// ---------- WEIGHT ----------
fetch(`${API_BASE_URL}/weight`)
  .then((res) => res.json())
  .then((rows) => {
    const data = rows.map((r) => ({ date: r[0], weight: Number(r[1]) }));
    data.sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const latest = data[data.length - 1].weight;
    const lost = START_WEIGHT - latest;
    const percent = Math.round((lost / (START_WEIGHT - GOAL_WEIGHT)) * 100);

    const bar = document.getElementById("progressBar");
    bar.style.width = `${percent}%`;
    bar.innerText = `${percent}%`;
    document.getElementById("progressText").innerText = `Lost ${lost.toFixed(
      1
    )} kg of ${START_WEIGHT - GOAL_WEIGHT} kg`;

    if (weightChart) weightChart.destroy();
    weightChart = new Chart(document.getElementById("weightChart"), {
      type: "line",
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: "Body Weight (kg)",
            data: data.map((d) => d.weight),
            tension: 0.3,
          },
        ],
      },
      options: { scales: { y: { reverse: true } } },
    });
  });

// ---------- WORKOUT ----------
fetch(`${API_BASE_URL}/workout-summary`)
  .then((res) => res.json())
  .then((rows) => {
    const wk = rows.map((r) => ({
      date: r[0],
      workouts: Number(r[1]),
      duration: Number(r[2]),
      sets: Number(r[3]),
    }));

    const current = wk.filter((d) => isCurrentMonth(d.date));
    if (!current.length) return;

    document.getElementById("wkCount").innerText = current.reduce(
      (s, d) => s + d.workouts,
      0
    );
    document.getElementById("wkDuration").innerText =
      Math.round(current.reduce((s, d) => s + d.duration, 0) / current.length) +
      " min";
    document.getElementById("wkSets").innerText = Math.round(
      current.reduce((s, d) => s + d.sets, 0) / current.length
    );

    const monthName = new Date().toLocaleString("default", { month: "long" });
    document.getElementById(
      "workoutTitle"
    ).innerText = `Workout Trend – ${monthName}`;

    if (workoutChart) workoutChart.destroy();
    workoutChart = new Chart(document.getElementById("workoutChart"), {
      type: "bar",
      data: {
        labels: current.map((d) => d.date),
        datasets: [
          { label: "Duration (min)", data: current.map((d) => d.duration) },
          { label: "Sets", data: current.map((d) => d.sets) },
        ],
      },
    });
  });
