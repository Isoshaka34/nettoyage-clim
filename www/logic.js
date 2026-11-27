// Nettoyage clim — calcul du prix de nettoyage / entretien climatisation.
// Fichier sans dépendance : utilisé par l'appli (window.TarifClim) et par les tests (node).
(function (racine) {
  "use strict";

  // Prix TTC par défaut. Modifiables dans l'onglet Réglages.
  var PARAMETRES_DEFAUT = {
    forfait: 10,          // prise en charge, protection, contrôle final, fiche d'entretien
    murale: 95,           // unité intérieure murale
    console: 105,         // unité intérieure console
    cassette: 130,        // unité intérieure cassette
    gainable: 160,        // unité intérieure gainable
    exterieure: 15,       // par groupe extérieur
    accesDifficile: 10,   // par groupe extérieur difficile d'accès (grande échelle, toit)
    remise: 0.10,         // sur chaque unité intérieure au-delà de la 2e
    seuilKm: 30,          // déplacement compris jusqu'à ce nombre de km depuis la ville de départ
    supplementKm: 15,     // au-delà du seuil
    arrondi: 5            // prix final arrondi au multiple de
  };

  var TYPES = [
    { cle: "murale", nom: "Murale" },
    { cle: "console", nom: "Console" },
    { cle: "cassette", nom: "Cassette" },
    { cle: "gainable", nom: "Gainable" }
  ];

  function entier(v) { v = Math.floor(Number(v) || 0); return v < 0 ? 0 : v; }
  function arrondir(x, pas) { return pas > 0 ? Math.round(x / pas) * pas : Math.round(x * 100) / 100; }

  // saisie : { murale, console, cassette, gainable, exterieures, difficiles, km (nombre ou null) }
  function calculer(saisie, p) {
    p = p || PARAMETRES_DEFAUT;
    var lignes = [];
    var nbUI = 0, montantUI = 0;
    TYPES.forEach(function (t) {
      var n = entier(saisie[t.cle]);
      if (!n) return;
      nbUI += n;
      montantUI += n * p[t.cle];
      lignes.push({ libelle: n + " unité" + (n > 1 ? "s" : "") + " intérieure" + (n > 1 ? "s" : "") + " " + t.nom.toLowerCase() + (n > 1 ? "s" : ""), montant: n * p[t.cle] });
    });
    var nbUE = entier(saisie.exterieures);
    if (nbUE) lignes.push({ libelle: nbUE + " groupe" + (nbUE > 1 ? "s" : "") + " extérieur" + (nbUE > 1 ? "s" : ""), montant: nbUE * p.exterieure });
    var nbDiff = Math.min(entier(saisie.difficiles), nbUE);
    if (nbDiff) lignes.push({ libelle: "Accès difficile (" + nbDiff + " groupe" + (nbDiff > 1 ? "s" : "") + ")", montant: nbDiff * p.accesDifficile });
    var remise = nbUI > 2 ? -((nbUI - 2) / nbUI) * montantUI * p.remise : 0;
    if (remise) lignes.push({ libelle: "Remise dégressive (" + (nbUI - 2) + " unité" + (nbUI - 2 > 1 ? "s" : "") + " au-delà de 2)", montant: remise });
    var km = saisie.km == null || saisie.km === "" ? null : Number(saisie.km);
    var horsZone = km != null && km > p.seuilKm;
    if (horsZone) lignes.push({ libelle: "Déplacement au-delà de " + p.seuilKm + " km", montant: p.supplementKm });
    var vide = nbUI === 0 && nbUE === 0;
    if (!vide) lignes.push({ libelle: "Forfait intervention", montant: p.forfait });
    var total = lignes.reduce(function (s, l) { return s + l.montant; }, 0);
    return {
      lignes: lignes,
      nbUI: nbUI,
      nbUE: nbUE,
      totalCalcule: Math.round(total * 100) / 100,
      prix: vide ? 0 : arrondir(total, p.arrondi),
      horsZone: horsZone,
      kmConnu: km != null,
      alertes: alertes(nbUI, nbUE, entier(saisie.difficiles))
    };
  }

  function alertes(nbUI, nbUE, diff) {
    var a = [];
    if (nbUI && !nbUE) a.push("Aucun groupe extérieur saisi.");
    if (nbUE && !nbUI) a.push("Aucune unité intérieure saisie.");
    if (nbUE > nbUI && nbUI) a.push("Plus de groupes extérieurs que d'unités intérieures : à vérifier.");
    if (diff > nbUE) a.push("Accès difficile : limité au nombre de groupes extérieurs.");
    return a;
  }

  // Distance à vol d'oiseau en km.
  function volOiseau(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function euros(x) {
    var n = Math.round(Math.abs(x) * 100) / 100;
    var s = (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (x < 0 ? "−" : "") + s + " €";
  }

  var api = { PARAMETRES_DEFAUT: PARAMETRES_DEFAUT, TYPES: TYPES, calculer: calculer, volOiseau: volOiseau, euros: euros, arrondir: arrondir };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else racine.TarifClim = api;
})(this);
