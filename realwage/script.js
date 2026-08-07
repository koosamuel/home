// 실질임금 부족분 보완 포트폴리오 추천 프로그램
// 강의노트("20 프로젝트.md" > 실질임금 부족분을 보완하는 포트폴리오 추천 시각화 프로그램) 스펙 기반

// 투자 성향별 배분 비율 — 강의노트 6장 예시(안정형 120/40/40, 균형형 80/60/60, 적극형 40/80/20/60, 각 합 200)에서 역산한 비율
const PORTFOLIO_MODELS = {
  stable: {
    label: "안정형",
    color: "#4f8cff",
    items: [
      { name: "예금·적금", ratio: 0.6, color: "#4f8cff" },
      { name: "채권형 상품", ratio: 0.2, color: "#7aa7ff" },
      { name: "소규모 부수입", ratio: 0.2, color: "#a7c4ff" },
    ],
  },
  balanced: {
    label: "균형형",
    color: "#4fd1a5",
    items: [
      { name: "예금·적금", ratio: 0.4, color: "#4fd1a5" },
      { name: "ETF 등 분산투자", ratio: 0.3, color: "#7fe0bf" },
      { name: "부수입", ratio: 0.3, color: "#b0eeda" },
    ],
  },
  aggressive: {
    label: "적극형",
    color: "#ff9d4f",
    items: [
      { name: "현금성 자산", ratio: 0.2, color: "#ff9d4f" },
      { name: "ETF·주식형 자산", ratio: 0.4, color: "#ffb77a" },
      { name: "교육·자격증 등 자기계발", ratio: 0.1, color: "#ffd1a7" },
      { name: "프리랜서·부업 수입", ratio: 0.3, color: "#ffe3c9" },
    ],
  },
};

const RISK_ORDER = ["stable", "balanced", "aggressive"];

// Chart.js 전역 기본값: 애니메이션·폰트
if (window.Chart) {
  Chart.defaults.animation = { duration: 700, easing: "easeOutQuart" };
  Chart.defaults.font.family =
    "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  Chart.defaults.color = "#9aa1ac";
  if (window.ChartDataLabels) Chart.register(ChartDataLabels);
}

let barChart, pieChart, compareChart, trendChart;

function formatWon(v) {
  const rounded = Math.round(v * 10) / 10;
  return `${rounded.toLocaleString("ko-KR")}만 원`;
}

function formatWonShort(v) {
  const rounded = Math.round(v);
  return rounded === 0 ? "" : `${rounded.toLocaleString("ko-KR")}`;
}

// 숫자 카운트업 애니메이션
function animateNumber(el, to, formatter, duration = 600) {
  const from = parseFloat(el.dataset.rawValue || "0") || 0;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const value = from + (to - from) * eased;
    el.textContent = formatter(value);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatter(to);
      el.dataset.rawValue = String(to);
    }
  }
  requestAnimationFrame(tick);
}

function calculate() {
  const current = parseFloat(document.getElementById("currentSalary").value) || 0;
  const next = parseFloat(document.getElementById("nextSalary").value) || 0;
  const inflation = parseFloat(document.getElementById("inflationRate").value) || 0;
  const years = Math.max(parseInt(document.getElementById("trendYears").value, 10) || 5, 1);
  const riskType = document.getElementById("riskType").value;

  // ① 연봉 인상액 (명목)
  const nominalIncrease = next - current;

  // ② 필요한 실질(목표) 연봉 = 현재 연봉 × (1 + 물가상승률)
  const requiredIncome = current * (1 + inflation / 100);

  // ③ 소득 부족분 = 필요한 목표 연봉 - 내년 예상 연봉
  const yearlyShortfall = Math.max(requiredIncome - next, 0);
  const monthlyShortfall = yearlyShortfall / 12;

  // 결과 카드 (카운트업 애니메이션)
  animateNumber(document.getElementById("nominalIncrease"), nominalIncrease, formatWon);
  animateNumber(document.getElementById("yearlyShortfall"), yearlyShortfall, formatWon);
  animateNumber(document.getElementById("monthlyShortfall"), monthlyShortfall, formatWon);
  document.getElementById("riskTypeLabel").textContent = PORTFOLIO_MODELS[riskType].label;

  renderBarChart(current, next, requiredIncome);
  renderTrendChart(current, next, inflation, years);
  renderPortfolio(riskType, yearlyShortfall);
  renderCompareChart(yearlyShortfall);
  renderScenarioTable(yearlyShortfall);
}

function renderBarChart(current, next, required) {
  const ctx = document.getElementById("salaryBarChart");
  const data = {
    labels: ["현재 연봉", "내년 예상 연봉", "필요한 목표 연봉"],
    datasets: [
      {
        label: "연봉 (만원)",
        data: [current, next, required],
        backgroundColor: ["#4f8cff55", "#4f8cffaa", "#ff6b6b"],
        borderColor: ["#4f8cff", "#4f8cff", "#ff6b6b"],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (c) => formatWon(c.raw) },
      },
      datalabels: {
        anchor: "end",
        align: "top",
        color: "#e8eaed",
        font: { weight: "600", size: 11 },
        formatter: (v) => formatWonShort(v),
      },
    },
    scales: {
      x: { ticks: { color: "#9aa1ac" }, grid: { display: false } },
      y: {
        ticks: { color: "#9aa1ac" },
        grid: { color: "#262b35" },
        grace: "10%",
      },
    },
  };
  if (barChart) {
    barChart.data = data;
    barChart.options = options;
    barChart.update();
  } else {
    barChart = new Chart(ctx, { type: "bar", data, options });
  }
}

// 연도별 명목 vs 실질(필요) 소득 추이
function renderTrendChart(current, next, inflation, years) {
  const raiseRate = current > 0 ? (next - current) / current : 0;
  const labels = [];
  const nominalSeries = [];
  const requiredSeries = [];
  for (let y = 0; y <= years; y++) {
    labels.push(`${y}년차`);
    nominalSeries.push(current * Math.pow(1 + raiseRate, y));
    requiredSeries.push(current * Math.pow(1 + inflation / 100, y));
  }

  const ctx = document.getElementById("trendLineChart");
  const data = {
    labels,
    datasets: [
      {
        label: "명목 연봉 추이",
        data: nominalSeries,
        borderColor: "#4f8cff",
        backgroundColor: "#4f8cff22",
        fill: "+1",
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: "필요한 실질 목표 연봉 추이",
        data: requiredSeries,
        borderColor: "#ff6b6b",
        backgroundColor: "#ff6b6b11",
        fill: false,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#e8eaed", boxWidth: 12 } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatWon(c.raw)}` } },
      datalabels: { display: false },
    },
    scales: {
      x: { ticks: { color: "#9aa1ac" }, grid: { display: false } },
      y: { ticks: { color: "#9aa1ac" }, grid: { color: "#262b35" } },
    },
  };
  if (trendChart) {
    trendChart.data = data;
    trendChart.options = options;
    trendChart.update();
  } else {
    trendChart = new Chart(ctx, { type: "line", data, options });
  }

  const gapEnd = requiredSeries[years] - nominalSeries[years];
  const trendNote = document.getElementById("trendNote");
  if (trendNote) {
    trendNote.textContent =
      gapEnd > 0
        ? `이 추세가 이어지면 ${years}년 후 명목 연봉과 필요 실질 연봉의 격차는 ${formatWon(gapEnd)}까지 벌어집니다.`
        : `이 추세라면 ${years}년 후에도 명목 연봉이 필요 실질 연봉을 따라잡습니다.`;
  }
}

function renderPortfolio(riskType, shortfall) {
  const model = PORTFOLIO_MODELS[riskType];
  const items = model.items.map((item) => ({
    ...item,
    amount: shortfall * item.ratio,
  }));

  const ctx = document.getElementById("portfolioPieChart");
  const data = {
    labels: items.map((i) => i.name),
    datasets: [
      {
        data: items.map((i) => i.amount),
        backgroundColor: items.map((i) => i.color),
        borderColor: "#171a21",
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#e8eaed", boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: (c) => `${c.label}: ${formatWon(c.raw)}`,
        },
      },
      datalabels: {
        color: "#0f1115",
        font: { weight: "700", size: 11 },
        formatter: (value, ctx2) => {
          const total = ctx2.dataset.data.reduce((a, b) => a + b, 0);
          if (!total) return "";
          const pct = (value / total) * 100;
          return pct >= 8 ? `${pct.toFixed(0)}%` : "";
        },
      },
    },
  };
  if (pieChart) {
    pieChart.data = data;
    pieChart.options = options;
    pieChart.update();
  } else {
    pieChart = new Chart(ctx, { type: "doughnut", data, options });
  }

  const list = document.getElementById("portfolioList");
  list.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="name"><span class="dot" style="background:${item.color}"></span>${item.name}</span>
      <span class="amount">${formatWon(item.amount)}</span>
    `;
    list.appendChild(li);
  });
}

// 세 투자 성향을 한 화면에서 비교하는 누적 막대 차트
function renderCompareChart(shortfall) {
  const allItemNames = [];
  const itemColors = {};
  RISK_ORDER.forEach((key) => {
    PORTFOLIO_MODELS[key].items.forEach((i) => {
      if (!allItemNames.includes(i.name)) {
        allItemNames.push(i.name);
        itemColors[i.name] = i.color;
      }
    });
  });

  const datasets = allItemNames.map((name) => ({
    label: name,
    backgroundColor: itemColors[name],
    data: RISK_ORDER.map((key) => {
      const item = PORTFOLIO_MODELS[key].items.find((i) => i.name === name);
      return item ? shortfall * item.ratio : 0;
    }),
    stack: "portfolio",
  }));

  const ctx = document.getElementById("compareBarChart");
  const data = {
    labels: RISK_ORDER.map((key) => PORTFOLIO_MODELS[key].label),
    datasets,
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#e8eaed", boxWidth: 12, font: { size: 10.5 } } },
      tooltip: {
        callbacks: {
          label: (c) => (c.raw > 0 ? `${c.dataset.label}: ${formatWon(c.raw)}` : null),
        },
      },
      datalabels: {
        color: "#0f1115",
        font: { weight: "700", size: 10 },
        formatter: (v) => (v > 0 ? formatWonShort(v) : ""),
      },
    },
    scales: {
      x: { stacked: true, ticks: { color: "#e8eaed" }, grid: { display: false } },
      y: { stacked: true, ticks: { color: "#9aa1ac" }, grid: { color: "#262b35" } },
    },
  };
  if (compareChart) {
    compareChart.data = data;
    compareChart.options = options;
    compareChart.update();
  } else {
    compareChart = new Chart(ctx, { type: "bar", data, options });
  }
}

function renderScenarioTable(shortfall) {
  const tbody = document.querySelector("#scenarioTable tbody");
  tbody.innerHTML = "";

  const allItemNames = [];
  Object.values(PORTFOLIO_MODELS).forEach((m) =>
    m.items.forEach((i) => {
      if (!allItemNames.includes(i.name)) allItemNames.push(i.name);
    })
  );

  allItemNames.forEach((name) => {
    const row = document.createElement("tr");
    let rowHtml = `<td>${name}</td>`;
    RISK_ORDER.forEach((key) => {
      const item = PORTFOLIO_MODELS[key].items.find((i) => i.name === name);
      rowHtml += `<td>${item ? formatWon(shortfall * item.ratio) : "—"}</td>`;
    });
    row.innerHTML = rowHtml;
    tbody.appendChild(row);
  });

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
    <td>합계 (연간 부족액)</td>
    <td>${formatWon(shortfall)}</td>
    <td>${formatWon(shortfall)}</td>
    <td>${formatWon(shortfall)}</td>
  `;
  tbody.appendChild(totalRow);
}

document.getElementById("calcBtn").addEventListener("click", calculate);
document.getElementById("riskType").addEventListener("change", calculate);
document.getElementById("trendYears").addEventListener("change", calculate);

// 초기 렌더 (강의노트 예시값)
calculate();
