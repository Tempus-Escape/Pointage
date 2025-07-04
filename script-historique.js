// script-historique.js – Affichage de l’historique des pointages
const API_URL = "https://script.google.com/macros/s/AKfycbz4A4osy5_HlfFI7lYDqtVpo67aNCjA2LGPfDsYvPdnp2RPj-egAxeZ0A-HRPxnpDaX9Q/exec";
let gmList = [];   // Liste des GM
let rooms   = [];  // Liste des salles {nom,duree,prix}

// 1) Initialisation au chargement de la page
async function initHistory() {
  const res  = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}`);
  const data = await res.json();
  gmList = data.noms;
  rooms  = data.salles.map(r => ({
    nom:   r[0],
    duree: parseFloat(r[1]),
    prix:  parseFloat(r[2])
  }));

  // Remplit le <select> GM
  const gmSelect = document.getElementById("gm-select");
  gmSelect.innerHTML = `<option value=\"\">--Choisir--</option>` + gmList.map(g => `<option>${g}</option>`).join("");

  // Lie le bouton de chargement
  document.getElementById("load-history").onclick = loadHistory;
}

// Fonction utilitaire : parse une date style "Fri Jun 06" vers "yyyy-MM-dd"
function parseDateString(dateStr) {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return ""; // si parsing échoue
  const year  = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day   = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 2) Charge et filtre l’historique
async function loadHistory() {
  const gm    = document.getElementById("gm-select").value;
  const start = document.getElementById("start-date").value;
  const end   = document.getElementById("end-date").value;

  if (!gm || !start || !end) {
    alert("Sélectionnez un GM et les deux dates");
    return;
  }

  const res  = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}&user=${encodeURIComponent(gm)}&all=1`);
  const rows = await res.json(); // [[date,hours,cost,q1,q2,…],…]

  const filtered = rows.filter(r => {
    const rowDate = parseDateString(r[0]);
    return rowDate >= start && rowDate <= end;
  });

  const container = document.getElementById("history-results");
  container.innerHTML = "";

  let totalH = 0, totalM = 0;

  filtered.forEach(row => {
    const date       = parseDateString(row[0]);
    const quantities = row.slice(3);

    // Création du bloc date + liste
    const block = document.createElement("div");
    block.classList.add("history-block");

    const dateDiv = document.createElement("div");
    dateDiv.classList.add("history-date");
    dateDiv.textContent = date;
    block.appendChild(dateDiv);

    const ul = document.createElement("ul");
    ul.classList.add("history-list");

    quantities.forEach((q, i) => {
      if (q > 0) {
        const li = document.createElement("li");
        li.textContent = `${rooms[i].nom} : ${q}`;
        ul.appendChild(li);
        totalH += q * rooms[i].duree;
        totalM += q * rooms[i].prix;
      }
    });

    block.appendChild(ul);
    container.appendChild(block);
  });

  document.getElementById("total-heures").textContent   = totalH.toFixed(2);
  document.getElementById("total-facture").textContent = totalM.toFixed(2);
}

initHistory().catch(console.error);