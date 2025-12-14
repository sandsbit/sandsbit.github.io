// Config constants from your data model:
const PROCEDURE_TYPES = [
  "Конституційне",
  "Цивільне",
  "Господарське",
  "Адміністративне",
  "Справи про адміністративні правопорушення",
  "Кримінальне",
];
const STATUSES = [
  "Подано",
  "Розглядається",
  "Апеляційне провадження",
  "Касаційне провадження",
  "Повторно розглядається",
  "Вирішення окремих питань",
  "Розглянуто",
  "Набрало законної сили, виконанню не підлягає",
  "Виконується",
  "Виконано",
  "Відмовлено в розгляді або справку відкликано",
];

// -------------- UI init --------------

const filterProcedureContainer = document.getElementById("filter-procedure");
const filterStatusContainer = document.getElementById("filter-status");
const sortSelect = document.getElementById("sort-select");

function createCheckbox(name, checked = true, groupName) {
  const id = `${groupName}-${name.replace(/\s+/g, "-")}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = name;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  checkbox.name = groupName;
  checkbox.value = name;
  checkbox.checked = checked;

  label.prepend(checkbox);
  return label;
}

function createFilters() {
  PROCEDURE_TYPES.forEach((type) => {
    filterProcedureContainer.appendChild(createCheckbox(type, true, "procedure"));
  });
  STATUSES.forEach((st) => {
    filterStatusContainer.appendChild(createCheckbox(st, true, "status"));
  });
}

// -------------- Data loading --------------

const categories = {
  personal: "category-personal",
  representation: "category-representation",
  other: "category-other",
};

let allCases = []; // will store all loaded cases with category info

async function loadManifest() {
  const res = await fetch("cases-manifest.json");
  if (!res.ok) throw new Error("Failed to load cases-manifest.json");
  return await res.json();
}

async function loadCase(category, filename) {
  const res = await fetch(`cases/${category}/${filename}`);
  if (!res.ok) {
    console.warn(`Failed to load ${filename} in ${category}`);
    return null;
  }
  return await res.json();
}

async function loadAllCases() {
  const manifest = await loadManifest();
  const promises = [];

  for (const [cat, files] of Object.entries(manifest)) {
    for (const file of files) {
      promises.push(
        loadCase(cat, file).then((data) => {
  if (data) {
    data._category = cat;
    data._file = file;
    allCases.push(data);
  }
})
      );
    }
  }
  await Promise.all(promises);
}



// -------------- Rendering --------------

function statusClass(status) {
  if (status === "Подано") return "status-podano";
  if (status === "Розглянуто") return "status-rozglyanuto";
  if (status === "Набрало законної сили, виконанню не підлягає")
    return "status-final";
  if (status === "Виконується" || status === "Виконано")
    return "status-execution";
  if (status === "Відмовлено в розгляді або справку відкликано")
    return "status-rejected";
  return "status-other";
}


function namesByPrefix(parties, prefix) {
  if (!Array.isArray(parties)) return "";
  return parties
    .filter((p) => p.status && p.status.startsWith(prefix))
    .map((p) => p.name)
    .join(", ");
}

function specialText(data) {
  const parties = data.parties || [];
  const posivach = namesByPrefix(parties, "Позивач");
  const vidpovidach = namesByPrefix(parties, "Відповідач");
  const obvynuvach = namesByPrefix(parties, "Обвинувачений");
  const prokuror = namesByPrefix(parties, "Прокурор");
  const pravoporushnyk = namesByPrefix(parties, "Правопорушник");

  const sudochynstvo = data.procedure || "";
  const first_instance_type = data.first_instance_type || "";
  const opis_pozovu = data.claim_description || "";

  if (sudochynstvo === "Кримінальне") {
    return `За обвинуваченням ${obvynuvach}${prokuror ? ", прокурор(и) " + prokuror : ""}, за ${opis_pozovu}`;
  } else if (sudochynstvo === "Справи про адміністративні правопорушення") {
    return `Щодо ${pravoporushnyk} за ${opis_pozovu}`;
  } else if (
    (sudochynstvo === "Цивільне" && first_instance_type === "Окреме провадження") ||
    sudochynstvo === "Конституційне"
  ) {
    return `За заявою ${posivach} про ${opis_pozovu}`;
  } else {
    return `За позовом ${posivach} до ${vidpovidach} про ${opis_pozovu}`;
  }
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

function renderCard(data) {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = data.title || "Без назви";
  card.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "card-subtitle";
  subtitle.textContent = `${data.case_number || ""} | ${data.procedure || ""}`;
  card.appendChild(subtitle);

  // Add submission date line
  if (data.submission_date) {
    const dateDiv = document.createElement("div");
    dateDiv.className = "submission-date";
    dateDiv.textContent = `Дата подання: ${formatDate(data.submission_date)}`;
    dateDiv.style.color = "#555";
    dateDiv.style.fontSize = "0.85rem";
    dateDiv.style.marginBottom = "0.3rem";
    card.appendChild(dateDiv);
  }

  const statusSpan = document.createElement("span");
  statusSpan.className = "status " + statusClass(data.status);
  statusSpan.textContent = data.status || "Невідомий стан";
  card.appendChild(statusSpan);

  const special = document.createElement("div");
  special.className = "special-text";
  special.textContent = specialText(data);
  card.appendChild(special);

  const court = document.createElement("div");
  court.className = "current-court";
  court.textContent = data.current_court || "";
  card.appendChild(court);

  card.addEventListener("click", () => {
  const url = new URL("case.html", window.location.origin + window.location.pathname.replace(/index\.html$/, ""));
  url.searchParams.set("category", data._category);
  url.searchParams.set("file", data._file);
  window.location.href = url.toString();
});

  return card;
}


function clearCards() {
  for (const cat of Object.values(categories)) {
    document.getElementById(cat).innerHTML = "";
  }
}

function applyFiltersAndRender() {
  // get checked filters
  const checkedProcedures = Array.from(document.querySelectorAll('input[name="procedure"]:checked')).map((i) => i.value);
  const checkedStatuses = Array.from(document.querySelectorAll('input[name="status"]:checked')).map((i) => i.value);

  // filter cases
  const filtered = allCases.filter((c) => {
    return checkedProcedures.includes(c.procedure) && checkedStatuses.includes(c.status);
  });

  // sort cases
  const sortVal = sortSelect.value;
  filtered.sort((a, b) => {
    function parseDate(d) {
      return d ? new Date(d) : new Date(0);
    }
    if (sortVal === "submission_date_asc")
      return parseDate(a.submission_date) - parseDate(b.submission_date);
    if (sortVal === "submission_date_desc")
      return parseDate(b.submission_date) - parseDate(a.submission_date);
    if (sortVal === "last_change_date_asc")
      return parseDate(a.last_change_date) - parseDate(b.last_change_date);
    if (sortVal === "last_change_date_desc")
      return parseDate(b.last_change_date) - parseDate(a.last_change_date);
    return 0;
  });

  clearCards();

  // render cards by category
  for (const c of filtered) {
    const container = document.getElementById(categories[c._category]);
    if (container) container.appendChild(renderCard(c));
  }
}

// Setup filters & events
createFilters();

filterProcedureContainer.addEventListener("change", applyFiltersAndRender);
filterStatusContainer.addEventListener("change", applyFiltersAndRender);
sortSelect.addEventListener("change", applyFiltersAndRender);

// Initial load
loadAllCases().then(() => {
  applyFiltersAndRender();
});