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

  const chartContainer = document.getElementById("viewsChart");
  if (!window.Plotly) {
    const fallbackMessage = document.createElement("p");
    fallbackMessage.textContent =
      "We couldn't load the chart library. Please refresh the page once your connection allows local assets to load.";
    fallbackMessage.setAttribute("role", "status");
    fallbackMessage.style.marginTop = "1.5rem";
    fallbackMessage.style.textAlign = "center";
    chartContainer.replaceWith(fallbackMessage);
    console.error("Plotly failed to initialize");
    return;
  }
  const accentMike = getComputedStyle(document.documentElement).getPropertyValue("--accent-mike") || "#2ecc71";
  const accentYann = getComputedStyle(document.documentElement).getPropertyValue("--accent-yann") || "#e74c3c";

  const traces = [
    {
      name: "Mike",
      x: labels,
      y: mikeSeries,
      mode: "lines+markers",
      line: {
        color: accentMike.trim(),
        width: 3,
        shape: "spline",
        smoothing: 0.45,
      },
      marker: {
        size: 8,
        color: accentMike.trim(),
      },
      hovertemplate: "Mike: %{y:,} views<extra></extra>",
    },
    {
      name: "Yann (adjusted)",
      x: labels,
      y: yannSeries,
      mode: "lines+markers",
      line: {
        color: accentYann.trim(),
        width: 3,
        shape: "spline",
        smoothing: 0.45,
      },
      marker: {
        size: 8,
        color: accentYann.trim(),
      },
      hovertemplate: "Yann (adjusted): %{y:,} views<extra></extra>",
    },
  ];

  const textColor = getComputedStyle(document.body).color || "#f0f6fc";

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 60, r: 30, t: 60, b: 60 },
    font: {
      family: "Open Sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      color: textColor.trim(),
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "rgba(13, 17, 23, 0.9)",
      bordercolor: "rgba(255, 255, 255, 0.12)",
    },
    xaxis: {
      title: "",
      tickfont: { color: "rgba(240, 246, 252, 0.85)" },
      gridcolor: "rgba(255, 255, 255, 0.08)",
      zeroline: false,
    },
    yaxis: {
      title: "Views",
      tickfont: { color: "rgba(240, 246, 252, 0.85)" },
      gridcolor: "rgba(255, 255, 255, 0.08)",
      zeroline: false,
      tickformat: ",d",
      rangemode: "tozero",
    },
    legend: {
      orientation: "h",
      x: 0,
      xanchor: "left",
      y: 1.15,
      yanchor: "top",
      font: { size: 13 },
    },
  };

  const config = {
    responsive: true,
    displayModeBar: false,
  };

  const applyChartHeight = () => {
    const computedHeight = Math.max(320, Math.min(520, chartContainer.offsetWidth * 0.55));
    chartContainer.style.height = `${computedHeight}px`;
  };

  applyChartHeight();
  window.Plotly.newPlot(chartContainer, traces, layout, config);

  const resizeObserver = new ResizeObserver(() => {
    applyChartHeight();
    window.Plotly.Plots.resize(chartContainer);
  });
  resizeObserver.observe(chartContainer);
})();
