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


    // Провадження
  const provadzhennyaSection = document.createElement("section");
  const provadzhennyaTitle = document.createElement("h2");
  provadzhennyaTitle.textContent = "Провадження";
  provadzhennyaSection.appendChild(provadzhennyaTitle);

  const provadzhennyaList = document.createElement("ul");
  if (Array.isArray(data.procedure_entries)) {
    data.procedure_entries.forEach(([num, comment]) => {
      const li = document.createElement("li");
      li.textContent = `${num}${comment ? " — " + comment : ""}`;
      provadzhennyaList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    provadzhennyaList.appendChild(li);
  }
  provadzhennyaSection.appendChild(provadzhennyaList);
  document.getElementById("case-details").appendChild(provadzhennyaSection);


  // Сторони та треті особи — bold status
  const parties = document.getElementById("parties-list");
  parties.innerHTML = "";
  (data.parties || []).forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.status}</strong>: ${p.name}`;
    parties.appendChild(li);
  });

    // Інші суди
  const othersSection = document.createElement("section");
  const othersTitle = document.createElement("h2");
  othersTitle.textContent = "Інші суди";
  othersSection.appendChild(othersTitle);

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
  document.getElementById("case-details").appendChild(othersSection);

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


  // Позовні вимоги — numbered list
  const claimsParent = document.getElementById("claims-list");
  claimsParent.innerHTML = "";
  const ol = document.createElement("ol");
  (data.claims || []).forEach(c => {
    const li = document.createElement("li");
    li.textContent = c;
    ol.appendChild(li);
  });
  claimsParent.appendChild(ol);


  // Хід справи — with fallback
  const progressParent = document.getElementById("progress-list");
  progressParent.innerHTML = "";
  if (Array.isArray(data.progress) && data.progress.length > 0) {
    data.progress.forEach(step => {
      const li = document.createElement("li");
      li.textContent = `${step.date}: ${step.text}`;
      progressParent.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Немає даних";
    progressParent.appendChild(li);
  }

}

loadCase();
