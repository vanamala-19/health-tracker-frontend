// =====================

// CONFIG

// =====================

const MODE = "Prod"; // "local" or "Prod"



const API_BASE_URL =

  MODE === "local"

    ? "http://localhost:3000"

    : "https://health-tracker-backend-z131.onrender.com";



const START_WEIGHT = 83;

const GOAL_WEIGHT = 67;



let calorieChart, proteinChart, weightChart, workoutChart;



// =====================

// HELPERS

// =====================

function parseDate(dateStr) {

  if (!dateStr) return new Date(0);



  // DD/MM/YYYY

  if (dateStr.includes("/")) {

    const [d, m, y] = dateStr.split("/");

    return new Date(y, m - 1, d);

  }

  return new Date(dateStr);

}



function isCurrentMonth(dateStr) {

  const d = parseDate(dateStr);

  const now = new Date();

  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

}



function calculateProteinStreak(daily, target = 80) {

  let streak = 0;

  for (let i = daily.length - 1; i >= 0; i--) {

    if (daily[i].protein >= target) streak++;

    else break;

  }

  return streak;

}



// =====================

// MONTHLY SUMMARY (DIET)

// =====================

function renderMonthlySummary(daily) {

  const monthData = daily.filter((d) => isCurrentMonth(d.date));



  if (!monthData.length) {

    document.getElementById("monthCalories").innerText = "-- kcal";

    document.getElementById("monthProtein").innerText = "-- g protein/day";

    document.getElementById("monthStatus").innerText = "No data yet";

    return;

  }



  const days = monthData.length;

  const totalCalories = monthData.reduce((s, d) => s + d.calories, 0);

  const totalProtein = monthData.reduce((s, d) => s + d.protein, 0);



  const avgCalories = Math.round(totalCalories / days);

  const avgProtein = Math.round(totalProtein / days);



  document.getElementById("monthCalories").innerText =

    `${avgCalories} kcal/day`;

  document.getElementById("monthProtein").innerText =

    `${avgProtein} g protein/day`;



  let status = "⚠ Needs adjustment";

  let color = "#e67e22";



  if (avgCalories <= 1800 && avgProtein >= 110) {

    status = "✅ On track";

    color = "#2ecc71";

  }



  const statusEl = document.getElementById("monthStatus");

  statusEl.innerText = status;

  statusEl.style.color = color;

}



// =====================

// DIET SUMMARY

// =====================

fetch(`${API_BASE_URL}/summary/`)

  .then((res) => res.json())

  .then((rows) => {

    const daily = rows.map((r) => ({

      date: r[0],

      day: r[1],

      calories: Number(r[2]) || 0,

      protein: Number(r[3]) || 0,

      meals: Number(r[4]) || 0,

    }));



    daily.sort((a, b) => parseDate(a.date) - parseDate(b.date));



    document.getElementById("avgCalories").innerText =

      Math.round(daily.reduce((s, d) => s + d.calories, 0) / daily.length);



    document.getElementById("avgProtein").innerText =

      Math.round(daily.reduce((s, d) => s + d.protein, 0) / daily.length);



    renderMonthlySummary(daily);



    const streak = calculateProteinStreak(daily);

    const streakEl = document.getElementById("proteinStreak");

    streakEl.innerText = `${streak} days`;

    streakEl.style.color =

      streak >= 3 ? "#27ae60" : streak >= 1 ? "#f39c12" : "#e74c3c";



    if (calorieChart) calorieChart.destroy();

    calorieChart = new Chart(document.getElementById("calorieChart"), {

      type: "line",

      data: {

        labels: daily.map((d) => d.date),

        datasets: [{ label: "Calories", data: daily.map((d) => d.calories) }],

      },

    });



    if (proteinChart) proteinChart.destroy();

    proteinChart = new Chart(document.getElementById("proteinChart"), {

      type: "bar",

      data: {

        labels: daily.map((d) => d.date),

        datasets: [{ label: "Protein (g)", data: daily.map((d) => d.protein) }],

      },

    });

  });



// =====================

// WEIGHT

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



    const lost = START_WEIGHT - latest;

    const percent = Math.round((lost / (START_WEIGHT - GOAL_WEIGHT)) * 100);



    const bar = document.getElementById("progressBar");

    bar.style.width = `${percent}%`;

    bar.innerText = `${percent}%`;



    document.getElementById("progressText").innerText =

      `Lost ${lost.toFixed(1)} kg of ${START_WEIGHT - GOAL_WEIGHT} kg`;



    if (weightChart) weightChart.destroy();

    weightChart = new Chart(document.getElementById("weightChart"), {

      type: "line",

      data: {

        labels: data.map((d) => d.date),

        datasets: [{ label: "Body Weight (kg)", data: data.map((d) => d.weight) }],

      },

      options: { scales: { y: { reverse: true } } },

    });

  });



// =====================

// WORKOUT SUMMARY (UPDATED)

// =====================

let workoutMonth = new Date();

let allWorkoutRows = [];



function changeWorkoutMonth(delta) {

  workoutMonth.setMonth(workoutMonth.getMonth() + delta);

  renderWorkoutChart();

}



function renderWorkoutChart() {

  const current = allWorkoutRows.filter((d) => {

    const date = parseDate(d.date);

    return (

      date.getMonth() === workoutMonth.getMonth() &&

      date.getFullYear() === workoutMonth.getFullYear()

    );

  });



  document.getElementById("workoutTitle").innerText =

    `Workout Trend – ${workoutMonth.toLocaleString("default", {

      month: "long",

      year: "numeric",

    })}`;



  if (!current.length) {

    if (workoutChart) workoutChart.destroy();

    return;

  }



  const labels = current.map((d) => d.date);

  const sets = current.map((d) => d.sets);

  const colors = current.map((d) =>

    d.status === "Rest" ? "#f1c40f" : "#2ecc71"

  );



  document.getElementById("wkCount").innerText =

    current.filter((d) => d.sets > 0).length;



  document.getElementById("wkSets").innerText =

    current.reduce((s, d) => s + d.sets, 0);



  if (workoutChart) workoutChart.destroy();

  workoutChart = new Chart(document.getElementById("workoutChart"), {

    type: "bar",

    data: {

      labels,

      datasets: [

        {

          label: "Total Sets",

          data: sets,

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
