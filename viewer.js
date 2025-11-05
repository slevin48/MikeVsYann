(async function renderDashboard() {
  const bossNameEl = document.getElementById("bossName");
  const bossSubtitleEl = document.getElementById("bossSubtitle");
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const mikeScoreEl = document.querySelector("#mikeScore");
  const yannScoreEl = document.querySelector("#yannScore");
  const mikeValueEl = mikeScoreEl.querySelector('[data-role="value"]');
  const mikeDeltaEl = mikeScoreEl.querySelector('[data-role="delta"]');
  const yannValueEl = yannScoreEl.querySelector('[data-role="value"]');
  const yannDeltaEl = yannScoreEl.querySelector('[data-role="delta"]');

  let data;
  try {
    const response = await fetch("data/views.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load stats: ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    bossNameEl.textContent = "Uh oh!";
    bossSubtitleEl.textContent = "We couldn't fetch the stats. Refresh and try again.";
    lastUpdatedEl.textContent = String(error);
    console.error(error);
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    bossNameEl.textContent = "No data yet";
    bossSubtitleEl.textContent = "Come back once the GitHub Action has collected some views.";
    lastUpdatedEl.textContent = "The scoreboard will update automatically after the first run.";
    return;
  }

  const labels = data.map((entry) => entry.date);
  const mikeSeries = data.map((entry) => Number(entry.mike_views || 0));
  const yannSeriesRaw = data.map((entry) => Number(entry.yann_views || 0));
  const handicap = 200;
  const yannSeries = yannSeriesRaw.map((value) => Math.max(0, value - handicap));

  const latestIndex = data.length - 1;
  const latestDate = new Date(data[latestIndex].date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const mikeLatest = mikeSeries[latestIndex];
  const yannLatest = yannSeries[latestIndex];

  mikeValueEl.textContent = mikeLatest.toLocaleString();
  mikeDeltaEl.textContent = `Raw views: ${mikeLatest.toLocaleString()}`;

  yannValueEl.textContent = yannLatest.toLocaleString();
  yannDeltaEl.textContent = `Raw views: ${yannSeriesRaw[latestIndex].toLocaleString()} (handicap −${handicap})`;

  lastUpdatedEl.textContent = `Last updated ${latestDate}. Data refreshes daily.`;

  if (mikeLatest === yannLatest) {
    bossNameEl.textContent = "It's a tie!";
    bossSubtitleEl.textContent = "The crown is still up for grabs.";
  } else if (mikeLatest > yannLatest) {
    bossNameEl.textContent = "MIKE IS THE BOSS";
    bossSubtitleEl.textContent = `Leading by ${(mikeLatest - yannLatest).toLocaleString()} adjusted views.`;
  } else {
    bossNameEl.textContent = "YANN IS THE BOSS";
    bossSubtitleEl.textContent = `Holding a ${(yannLatest - mikeLatest).toLocaleString()} adjusted view edge.`;
  }

  const ctx = document.getElementById("viewsChart");
  if (!window.Chart) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.textContent =
      "We couldn't load the chart library. Please refresh the page once your connection allows local assets to load.";
    fallbackMessage.setAttribute("role", "status");
    fallbackMessage.style.marginTop = "1.5rem";
    fallbackMessage.style.textAlign = "center";
    ctx.replaceWith(fallbackMessage);
    console.error("Chart.js failed to initialize");
    return;
  }
  const chart = new window.Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Mike",
          data: mikeSeries,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue("--accent-mike") || "#2ecc71",
          backgroundColor: "rgba(46, 204, 113, 0.18)",
          tension: 0.3,
          fill: false,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Yann (adjusted)",
          data: yannSeries,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue("--accent-yann") || "#e74c3c",
          backgroundColor: "rgba(231, 76, 60, 0.18)",
          tension: 0.3,
          fill: false,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.body).color,
            font: {
              family: 'Open Sans',
              size: 13,
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y ?? 0;
              return `${context.dataset.label}: ${value.toLocaleString()} views`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(240, 246, 252, 0.85)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.08)",
          },
        },
        y: {
          ticks: {
            color: "rgba(240, 246, 252, 0.85)",
            callback(value) {
              return Number(value).toLocaleString();
            },
          },
          grid: {
            color: "rgba(255, 255, 255, 0.08)",
          },
          beginAtZero: true,
        },
      },
    },
  });

  // Make the canvas height responsive while keeping crisp UI.
  const resizeObserver = new ResizeObserver(() => {
    const parentWidth = ctx.parentElement.offsetWidth;
    ctx.style.height = `${Math.max(320, Math.min(520, parentWidth * 0.55))}px`;
    chart.resize();
  });
  resizeObserver.observe(ctx.parentElement);
})();
