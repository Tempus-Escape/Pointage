// script.js – Gestion du pointage quotidien des GM

const API_URL = "https://script.google.com/macros/s/AKfycbz4A4osy5_HlfFI7lYDqtVpo67aNCjA2LGPfDsYvPdnp2RPj-egAxeZ0A-HRPxnpDaX9Q/exec";

let rooms = [];    // [{ nom, duree, prix }]
let counts = {};   // { "Salle A": 0, … }
let gmList = [];   // ["Alice", "Bob", …]
let selectedGM = "";
let selectedRoom = "";

// Fonction d'initialisation
async function init() {
  // 1) Chargement des GM et des salles
  try {
    const res  = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}`);
    const data = await res.json();
    gmList = data.noms;
    rooms  = data.salles.map(r => ({
      nom:   r[0],
      duree: parseFloat(r[1]),
      prix:  parseFloat(r[2])
    }));
  } catch (err) {
    console.error("Erreur lors du chargement des données :", err);
    return;
  }

  // 2) Remplissage des <select>
  const gmSelect   = document.getElementById("gm-select");
  const roomSelect = document.getElementById("room-select");
  gmSelect.innerHTML   = `<option value="">--Choisir--</option>` + gmList.map(g => `<option>${g}</option>`).join("");
  roomSelect.innerHTML = `<option value="">--Choisir--</option>` + rooms.map(r => `<option>${r.nom}</option>`).join("");

  // 3) Initialisation des compteurs à zéro
  rooms.forEach(r => counts[r.nom] = 0);

  // 4) Liaison des événements
  gmSelect.addEventListener("change", onGMChange);
  roomSelect.addEventListener("change", updateRoomUI);
  document.getElementById("increment-btn").addEventListener("click", () => changeCount(+1));
  document.getElementById("decrement-btn").addEventListener("click", () => changeCount(-1));
  // Si tu as un bouton load-today, sinon tu peux commenter :
  const loadBtn = document.getElementById("load-today");
  if (loadBtn) loadBtn.addEventListener("click", loadToday);
  document.getElementById("submit-btn").addEventListener("click", sendData);
}

// Quand on change de GM
function onGMChange(e) {
  selectedGM = e.target.value;
  rooms.forEach(r => counts[r.nom] = 0);
  renderSummary();
  updateTotals();
  updateRoomUI();
  if(selectedGM){
    loadToday();
  }
}

// Met à jour le compteur visible
function updateRoomUI() {
  selectedRoom = document.getElementById("room-select").value;
  document.getElementById("room-count").textContent = counts[selectedRoom] || 0;
}

// Incrément / décrément
function changeCount(delta) {
  if (!selectedRoom) {
    alert("Choisissez d'abord une salle");
    return;
  }
  counts[selectedRoom] = Math.max(0, (counts[selectedRoom]||0) + delta);
  updateRoomUI();
  renderSummary();
  updateTotals();
}

// Affiche le récapitulatif
function renderSummary() {
  const ul = document.getElementById("recap-list");
  ul.innerHTML = "";
  Object.entries(counts).filter(([,n]) => n>0)
    .forEach(([name,n]) => {
      const li = document.createElement("li");
      li.textContent = `${name} : ${n}`;
      ul.appendChild(li);
    });
}

// Calcule et affiche les totaux
function updateTotals() {
  let totalH = 0, totalM = 0;
  rooms.forEach(r => {
    const n = counts[r.nom] || 0;
    totalH += n * r.duree;
    totalM += n * r.prix;
  });
  document.getElementById("total-time").textContent  = totalH.toFixed(2);
  document.getElementById("total-cost").textContent  = totalM.toFixed(2);
}

// Charge les données du jour (si tu gardes cette fonctionnalité)
async function loadToday() {
  if (!selectedGM) {
    alert("Choisissez d'abord votre nom");
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  try {
    const res  = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}&user=${encodeURIComponent(selectedGM)}`);
    const rows = await res.json();
    const todayRow = rows.find(r => r[0] === today);
    if (!todayRow) {
      alert("Pas d'enregistrement pour aujourd'hui");
      return;
    }
    rooms.forEach((r,i) => counts[r.nom] = parseInt(todayRow[3+i]) || 0);
    renderSummary();
    updateTotals();
    updateRoomUI();
  } catch (err) {
    console.error("Erreur lors du chargement d'aujourd'hui :", err);
  }
}


fetch(API_URL)
  .then(r => r.text())
  .then(txt => console.log("✅ Réponse GET brute :", txt))
  .catch(err => console.error("❌ Erreur GET test :", err));

// Envoi des données
async function sendData() {
    if (!selectedGM) {
      alert("Choisissez d'abord votre nom");
      return;
    }
    const code = document.getElementById("code-input").value.trim();
    if (!code) {
      alert("Entrez votre code secret");
      return;
    }
  
    // Prépare date et quantités
    const date = new Date().toISOString().slice(0,10);
    const vals = rooms.map(r => counts[r.nom] || 0).join(",");
  
    // Monte l'URL complète en GET
    const url = API_URL
      + `?origin=${encodeURIComponent(location.origin)}`
      + `&user=${encodeURIComponent(selectedGM)}`
      + `&code=${encodeURIComponent(code)}`
      + `&date=${encodeURIComponent(date)}`
      + `&vals=${encodeURIComponent(vals)}`;
  
    console.log("⤴️ GET vers", url);
  
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      alert(text === "OK" ? "Enregistré ✅" : "Erreur ❌ " + text);
    } catch (err) {
      console.error("❌ Erreur réseau GET:", err);
      alert("Erreur réseau, voir console.");
    }
  }

// Démarrage après chargement du DOM
document.addEventListener("DOMContentLoaded", init);