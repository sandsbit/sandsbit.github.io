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
  container.innerHTML = ""; // clear previous

  // Загальна інформація
  const generalSection = document.createElement("section");
  generalSection.id = "general-info";
  generalSection.innerHTML = `
    <h2>Загальна інформація</h2>
    <p><strong>Назва:</strong> ${data.title || ""}</p>
    <p><strong>Номер справи:</strong> ${data.case_number || ""}</p>
    <p><strong>Тип провадження в суді першої інстанції:</strong> ${data.first_instance_type || ""}</p>
    <p><strong>Дата подання:</strong> ${formatDate(data.submission_date)}</p>
    <p><strong>Поточний суд:</strong> ${data.current_court || ""}</p>
    <p><strong>Ціна позову:</strong> ${data.claim_price != null ? data.claim_price : ""}</p>
  `;
  container.appendChild(generalSection);

  // Провадження (from data.proceedings)
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

  // Сторони та треті особи (bold status)
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

  // Інші суди (right after parties)
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

  // Судовий склад
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

  // Позовні вимоги — numbered list
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

  // Опис позову
  const descriptionSection = document.createElement("section");
  descriptionSection.innerHTML = `<h2>Опис позову</h2><p>${data.claim_description || "Немає даних"}</p>`;
  container.appendChild(descriptionSection);

  // Хід справи (history)
  const progressSection = document.createElement("section");
  progressSection.innerHTML = `<h2>Хід справи</h2>`;
  const progressList = document.createElement("ul");

  if (Array.isArray(data.history) && data.history.length > 0) {
    data.history.forEach(item => {
      const li = document.createElement("li");
      const dateFormatted = formatDate(item.date);
      li.textContent = `${dateFormatted}: ${item.event}`;
      progressList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    progressList.appendChild(li);
  }

  progressSection.appendChild(progressList);
  container.appendChild(progressSection);
}


loadCase();
