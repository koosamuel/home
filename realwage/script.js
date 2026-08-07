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

let barChart, pieChart;

function formatWon(v) {
  const rounded = Math.round(v * 10) / 10;
  return `${rounded.toLocaleString("ko-KR")}만 원`;
}

function calculate() {
  const current = parseFloat(document.getElementById("currentSalary").value) || 0;
  const next = parseFloat(document.getElementById("nextSalary").value) || 0;
  const inflation = parseFloat(document.getElementById("inflationRate").value) || 0;
  const riskType = document.getElementById("riskType").value;

  // ① 연봉 인상액 (명목)
  const nominalIncrease = next - current;

  // ② 필요한 실질(목표) 연봉 = 현재 연봉 × (1 + 물가상승률)
  const requiredIncome = current * (1 + inflation / 100);

  // ③ 소득 부족분 = 필요한 목표 연봉 - 내년 예상 연봉
  const yearlyShortfall = Math.max(requiredIncome - next, 0);
  const monthlyShortfall = yearlyShortfall / 12;

  // 결과 카드
  document.getElementById("nominalIncrease").textContent = formatWon(nominalIncrease);
  document.getElementById("yearlyShortfall").textContent = formatWon(yearlyShortfall);
  document.getElementById("monthlyShortfall").textContent = formatWon(monthlyShortfall);
  document.getElementById("riskTypeLabel").textContent = PORTFOLIO_MODELS[riskType].label;

  renderBarChart(current, next, requiredIncome);
  renderPortfolio(riskType, yearlyShortfall);
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
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#9aa1ac" }, grid: { display: false } },
      y: { ticks: { color: "#9aa1ac" }, grid: { color: "#262b35" } },
    },
  };
  if (barChart) {
    barChart.data = data;
    barChart.update();
  } else {
    barChart = new Chart(ctx, { type: "bar", data, options });
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
    },
  };
  if (pieChart) {
    pieChart.data = data;
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

function renderScenarioTable(shortfall) {
  const tbody = document.querySelector("#scenarioTable tbody");
  tbody.innerHTML = "";

  // 모든 항목 이름을 모아 행으로 만든다 (성향마다 항목 구성이 다르므로 없는 항목은 '-')
  const allItemNames = [];
  Object.values(PORTFOLIO_MODELS).forEach((m) =>
    m.items.forEach((i) => {
      if (!allItemNames.includes(i.name)) allItemNames.push(i.name);
    })
  );

  allItemNames.forEach((name) => {
    const row = document.createElement("tr");
    let rowHtml = `<td>${name}</td>`;
    ["stable", "balanced", "aggressive"].forEach((key) => {
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

// 초기 렌더 (강의노트 예시값)
calculate();
