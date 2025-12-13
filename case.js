function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadCase() {
  const category = qs("category");
  const file = qs("file");

  if (!category || !file) {
    document.body.textContent = "Некоректне посилання на справу";
    return;
  }

  const res = await fetch(`cases/${category}/${file}`);
  if (!res.ok) {
    document.body.textContent = "Не вдалося завантажити справу";
    return;
  }

  const data = await res.json();
  renderCase(data);
}

function renderCase(data) {
  document.getElementById("case-title").textContent = data.title || "Без назви";

  document.getElementById("case-meta").textContent =
    `${data.case_number || ""} · ${data.procedure || ""} · ${data.status || ""}`;

  const general = document.getElementById("general-info");
  general.innerHTML = `
    <p><strong>Дата подання:</strong> ${data.submission_date || ""}</p>
    <p><strong>Поточний суд:</strong> ${data.current_court || ""}</p>
    <p><strong>Опис справи:</strong> ${data.claim_description || ""}</p>
    ${data.claim_price ? `<p><strong>Ціна позову:</strong> ${data.claim_price}</p>` : ""}
  `;

  const parties = document.getElementById("parties-list");
  (data.parties || []).forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.status}: ${p.name}`;
    parties.appendChild(li);
  });

  const courts = document.getElementById("court-composition");
  (data.court_composition || []).forEach(entry => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${entry.instance}</strong>`;
    const ul = document.createElement("ul");
    entry.panel.forEach(j => {
      const li = document.createElement("li");
      li.textContent = `${j.name}${j.status ? " — " + j.status : ""}`;
      ul.appendChild(li);
    });
    div.appendChild(ul);
    courts.appendChild(div);
  });

  const claims = document.getElementById("claims-list");
  (data.claims || []).forEach(c => {
    const li = document.createElement("li");
    li.textContent = c;
    claims.appendChild(li);
  });

  const progress = document.getElementById("progress-list");
  (data.progress || []).forEach(step => {
    const li = document.createElement("li");
    li.textContent = `${step.date}: ${step.text}`;
    progress.appendChild(li);
  });
}

loadCase();
