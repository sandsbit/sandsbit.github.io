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

function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}



function renderCase(data) {
  const container = document.getElementById("case-details");
  container.innerHTML = ""; // clear previous content

  // --- Caption with Назва, Номер справи, Стан ---
  const caption = document.createElement("div");
  caption.style.marginBottom = "1rem";
  caption.innerHTML = `
    <h1 style="margin:0;">${data.title || "Без назви"}</h1>
    <p style="margin: 0.2rem 0; font-weight: 600;">
      Номер справи: ${data.case_number || "—"} |
      <span class="status ${statusClass(data.status)}" style="padding: 0.15em 0.5em; border-radius: 1rem; font-size: 1rem; font-weight: 700;">
        ${data.status || "Невідомий стан"}
      </span>
    </p>
  `;
  container.appendChild(caption);

  // --- Загальна інформація ---
  const generalSection = document.createElement("section");
  generalSection.id = "general-info";
  generalSection.innerHTML = `
    <h2>Загальна інформація</h2>
    <p><strong>Тип провадження в суді першої інстанції:</strong> ${data.first_instance_type || ""}</p>
    <p><strong>Дата подання:</strong> ${formatDate(data.submission_date)}</p>
    <p><strong>Поточний суд:</strong> ${data.current_court || ""}</p>
    <p><strong>Ціна позову:</strong> ${data.claim_price != null ? data.claim_price : ""}</p>
    <p><strong>Опис позову:</strong> про ${data.claim_description || "—"}</p>
  `;
  container.appendChild(generalSection);

  // --- Провадження ---
  const provadzhennyaSection = document.createElement("section");
  provadzhennyaSection.innerHTML = `<h2>Провадження</h2>`;
  const provadzhennyaList = document.createElement("ul");

  if (Array.isArray(data.proceedings) && data.proceedings.length > 0) {
    data.proceedings.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.number}${p.comment ? " — " + p.comment : ""}`;
      provadzhennyaList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    provadzhennyaList.appendChild(li);
  }

  provadzhennyaSection.appendChild(provadzhennyaList);
  container.appendChild(provadzhennyaSection);

  // --- Сторони та треті особи ---
  const partiesSection = document.createElement("section");
  partiesSection.innerHTML = `<h2>Сторони та треті особи</h2>`;
  const partiesList = document.createElement("ul");

  if (Array.isArray(data.parties) && data.parties.length > 0) {
    data.parties.forEach(p => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${p.status}</strong>: ${p.name}`;
      partiesList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    partiesList.appendChild(li);
  }

  partiesSection.appendChild(partiesList);
  container.appendChild(partiesSection);

  // --- Інші суди ---
  const othersSection = document.createElement("section");
  othersSection.innerHTML = `<h2>Інші суди</h2>`;
  const othersList = document.createElement("ul");

  if (Array.isArray(data.other_courts) && data.other_courts.length > 0) {
    data.other_courts.forEach(court => {
      const li = document.createElement("li");
      li.textContent = court;
      othersList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    othersList.appendChild(li);
  }

  othersSection.appendChild(othersList);
  container.appendChild(othersSection);

  // --- Судовий склад ---
  const courtSection = document.createElement("section");
  courtSection.innerHTML = `<h2>Склад суду</h2>`;

  if (Array.isArray(data.court_composition) && data.court_composition.length > 0) {
    data.court_composition.forEach(instance => {
      const instDiv = document.createElement("div");
      instDiv.innerHTML = `<h3>${instance.instance}</h3>`;
      const panelList = document.createElement("ul");
      if (Array.isArray(instance.panel)) {
        instance.panel.forEach(member => {
          const li = document.createElement("li");
          li.textContent = `${member.name} (${member.status})`;
          panelList.appendChild(li);
        });
      }
      instDiv.appendChild(panelList);
      courtSection.appendChild(instDiv);
    });
  } else {
    courtSection.appendChild(document.createTextNode("Немає даних"));
  }
  container.appendChild(courtSection);

  // --- Позовні вимоги (numbered list) ---
  const claimsSection = document.createElement("section");
  claimsSection.innerHTML = `<h2>Позовні вимоги</h2>`;
  const claimsList = document.createElement("ol");
  if (Array.isArray(data.claims) && data.claims.length > 0) {
    data.claims.forEach(claim => {
      const li = document.createElement("li");
      li.textContent = claim;
      claimsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    claimsList.appendChild(li);
  }
  claimsSection.appendChild(claimsList);
  container.appendChild(claimsSection);

  // --- Хід справи (styled table) ---
  const progressSection = document.createElement("section");
  progressSection.innerHTML = `<h2>Хід справи</h2>`;

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "0.5rem";

  // Table body
  const tbody = document.createElement("tbody");

  if (Array.isArray(data.history) && data.history.length > 0) {
    data.history.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.style.backgroundColor = index % 2 === 0 ? "#f9f9f9" : "#ffffff";

      // Date cell - light background, bold
      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(item.date);
      tdDate.style.padding = "0.4rem 0.75rem";
      tdDate.style.backgroundColor = "#e8f0fe";  // soft blue
      tdDate.style.fontWeight = "600";
      tdDate.style.width = "25%";
      tr.appendChild(tdDate);

      // Event cell - white background, normal text
      const tdEvent = document.createElement("td");
      tdEvent.textContent = item.event;
      tdEvent.style.padding = "0.4rem 0.75rem";
      tdEvent.style.backgroundColor = "#fff";
      tr.appendChild(tdEvent);

      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "Немає даних";
    td.style.padding = "0.4rem 0.75rem";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  progressSection.appendChild(table);
  container.appendChild(progressSection);
}



loadCase();
