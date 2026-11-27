// Vérifie que l'appli retombe sur la grille Excel par défaut.  Lancer : node tests/logic.test.js
const T = require("../www/logic.js");
const cas = [
  ["Monosplit", { murale: 1, exterieures: 1 }, 120],
  ["Bi-split", { murale: 2, exterieures: 1 }, 215],
  ["Tri-split", { murale: 3, exterieures: 1 }, 300],
  ["Quadri-split", { murale: 4, exterieures: 1 }, 385],
  ["Penta-split", { murale: 5, exterieures: 1 }, 470],
  ["2 monosplits", { murale: 2, exterieures: 2 }, 230],
  ["3 monosplits", { murale: 3, exterieures: 3 }, 330],
  ["Bi + mono", { murale: 3, exterieures: 2 }, 315],
  ["Tri + mono", { murale: 4, exterieures: 2 }, 400],
  ["Bi + mono, 1 toit, 35 km", { murale: 3, exterieures: 2, difficiles: 1, km: 35 }, 340],
  ["Mono à 30 km pile", { murale: 1, exterieures: 1, km: 30 }, 120],
  ["Mono à 31 km", { murale: 1, exterieures: 1, km: 31 }, 135],
  ["Accès difficile plafonné", { murale: 1, exterieures: 1, difficiles: 3 }, 130],
  ["Vide", {}, 0],
];
let ko = 0;
for (const [nom, s, attendu] of cas) {
  const r = T.calculer(s);
  const ok = r.prix === attendu;
  if (!ok) ko++;
  console.log(`${ok ? "OK " : "KO "} ${nom.padEnd(28)} ${r.prix} (attendu ${attendu})`);
}
const d = T.volOiseau({ lat: 43.6757, lng: 4.1356 }, { lat: 43.6108, lng: 3.8767 });
console.log("Lunel → Montpellier vol d'oiseau ≈", d.toFixed(1), "km");
if (d < 20 || d > 25) ko++;
process.exit(ko ? 1 : 0);
