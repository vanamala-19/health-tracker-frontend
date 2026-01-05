// =====================

// CONFIG

// =====================

const MODE = "Prod";



const API_BASE_URL =

  MODE === "local"

    ? "http://localhost:3000"

    : "https://health-tracker-backend-z131.onrender.com";



let calorieChart, proteinChart;



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



function isSameMonth(d, ref) {

  return (

    d.getMonth() === ref.getMonth() &&

    d.getFullYear() === ref.getFullYear()

  );

}



// =====================

// CURRENT WORKOUT MONTH

// =====================

let workoutMonth = new Date();

let workoutData = [];



// =====================

// DIET SUMMARY

// =====================

fetch(`${API_BASE_URL}/summary/`)

  .then((res) => res.json())

  .then((rows) => {

    const daily = rows.map((r) => ({

      date: r[0],

      calories: Number(r[2]) || 0,

      protein: Number(r[3]) || 0,

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



    // Calories chart

    if (calorieChart) calorieChart.destroy();

    calorieChart = new Chart(document.getElementById("calorieChart"), {

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

    });



    // Protein chart

    if (proteinChart) proteinChart.destroy();

    proteinChart = new Chart(document.getElementById("proteinChart"), {

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

    });

  });



// =====================

// WEIGHT (LATEST ONLY)

// =====================

fetch(`${API_BASE_URL}/summary/weight`)

  .then((res) => res.json())

  .then((rows) => {

    if (!rows.length) return;

    const latest = rows[rows.length - 1];

    document.getElementById("bodyWeight").innerText = latest[1];

  });



// =====================

// WORKOUT SUMMARY (MONTH-BASED)

// =====================

fetch(`${API_BASE_URL}/summary/workout-summary`)

  .then((res) => res.json())

  .then((rows) => {

    workoutData = rows.map((r) => ({

      date: parseDate(r[0]),

      sets: Number(r[4]) || 0,

      status: r[5], // "Workout completed" or "Rest"

    }));



    renderWorkoutSummary();

  });



function renderWorkoutSummary() {

  const monthRows = workoutData.filter((d) =>

    isSameMonth(d.date, workoutMonth)

  );



  // Count workout days (Mon–Sun)

  const workoutDays = monthRows.filter((d) => d.sets > 0).length;



  document.getElementById("workouts").innerText = workoutDays;

}



// =====================

// MONTH CHANGE (KEYBOARD)

// =====================

document.addEventListener("keydown", (e) => {

  if (e.key === "ArrowLeft") {

    workoutMonth.setMonth(workoutMonth.getMonth() - 1);

    renderWorkoutSummary();

  }



  if (e.key === "ArrowRight") {

    workoutMonth.setMonth(workoutMonth.getMonth() + 1);

    renderWorkoutSummary();

  }

});
