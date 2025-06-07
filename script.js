// script.js – Gestion du pointage quotidien des GM

// → URL de ton Apps Script Web App (POST + GET)
const API_URL = "https://script.google.com/macros/s/AKfycbz4A4osy5_HlfFI7lYDqtVpo67aNCjA2LGPfDsYvPdnp2RPj-egAxeZ0A-HRPxnpDaX9Q/exec";

// Stocke la configuration des salles et le nombre de parties
let rooms = [];   // [{ nom, duree, prix }]
let counts = {};  // { "Salle A": 0, … }
let gmList = [];  // ["Alice", "Bob", …]
let selectedGM = "";
let selectedRoom = "";

// 1) Initialisation au chargement
async function init() {
  // a) Récupère via GET la liste des GM et des salles depuis Apps Script
  const res = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}`);
  const data = await res.json();
  gmList = data.noms;       // tableau de chaînes
  rooms  = data.salles.map(r => ({
    nom:    r[0],
    duree:  parseFloat(r[1]),
    prix:   parseFloat(r[2])
  }));

  // b) Remplit le <select> Game Master
  const gmSelect = document.getElementById("gm-select");
  gmSelect.innerHTML = `<option value="">--Choisir--</option>`
    + gmList.map(g => `<option>${g}</option>`).join("");

  // c) Remplit le <select> Salle
  const roomSelect = document.getElementById("room-select");
  roomSelect.innerHTML = `<option value="">--Choisir--</option>`
    + rooms.map(r => `<option>${r.nom}</option>`).join("");

  // d) Initialise counts à zéro pour chaque salle
  rooms.forEach(r => counts[r.nom] = 0);

  // e) Bind des événements UI
  gmSelect.onchange       = onGMChange;
  roomSelect.onchange     = updateRoomUI;
  document.getElementById("increment-btn").onclick = () => changeCount(+1);
  document.getElementById("decrement-btn").onclick = () => changeCount(-1);
  document.getElementById("load-today").onclick   = loadToday;
  document.getElementById("submit-btn").onclick    = sendData;
}

// Quand on change de GM
function onGMChange() {
  selectedGM = this.value;
  // Réinitialise tous les compteurs et l'affichage
  rooms.forEach(r => counts[r.nom] = 0);
  renderSummary();
  updateTotals();
  updateRoomUI();
}

// Met à jour l'affichage du compteur pour la salle sélectionnée
function updateRoomUI() {
  selectedRoom = document.getElementById("room-select").value;
  document.getElementById("room-count").textContent = counts[selectedRoom] || 0;
}

// Incrémente/décrémente le nombre de parties
function changeCount(delta) {
  if (!selectedRoom) { alert("Choisissez d'abord une salle"); return; }
  counts[selectedRoom] = Math.max(0, (counts[selectedRoom]||0) + delta);
  updateRoomUI();
  renderSummary();
  updateTotals();
}

// Affiche la liste récapitulative des salles jouées
function renderSummary() {
  const ul = document.getElementById("recap-list");
  ul.innerHTML = "";
  Object.entries(counts)
    .filter(([_,n]) => n > 0)
    .forEach(([name,n]) => {
      const li = document.createElement("li");
      li.textContent = `${name} : ${n}`;
      ul.appendChild(li);
    });
}

// Calcule et affiche les totaux (heures et montant)
function updateTotals() {
  let totalHours = 0, totalCost = 0;
  rooms.forEach(r => {
    const n = counts[r.nom] || 0;
    totalHours += n * r.duree;
    totalCost  += n * r.duree * r.prix;
  });
  document.getElementById("total-time").textContent  = totalHours.toFixed(2);
  document.getElementById("total-cost").textContent  = totalCost.toFixed(2);
}

// Charge les données du jour en cours pour modification
async function loadToday() {
  if (!selectedGM) { alert("Choisissez d'abord votre nom"); return; }
  const today = new Date().toISOString().slice(0,10);
  const res = await fetch(`${API_URL}?origin=${encodeURIComponent(location.origin)}&user=${encodeURIComponent(selectedGM)}`);
  const rows = await res.json(); // renvoie [[date,hours,cost,q1,q2,...], ...]
  const todayRow = rows.find(r => r[0] === today);
  if (!todayRow) { alert("Pas d'enregistrement pour aujourd'hui"); return; }
  // todayRow = [date, totalH, totalM, q1, q2,...]
  rooms.forEach((r,i) => counts[r.nom] = parseInt(todayRow[3+i]) || 0);
  renderSummary();
  updateTotals();
  updateRoomUI();
}

// Envoie toutes les données à Apps Script via POST
async function sendData() {
    // … tes validations de GM et de code ici …
  
    const payload = {
      origin: location.origin,
      user:   selectedGM,
      code:   code,
      valeurs: [
        new Date().toISOString().slice(0,10),       // la date
        ...rooms.map(r => counts[r.nom] || 0)       // les quantités de chaque salle
      ]
    };
  
    console.log("▶️ Envoi du payload au serveur :", payload);
  
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    // …
  }

// Démarre l'initialisation
init().catch(console.error);