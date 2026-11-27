// Nettoyage clim — écrans. La logique de prix est dans logic.js.
(function () {
  "use strict";
  var T = window.TarifClim;
  var $ = function (id) { return document.getElementById(id); };
  var CLE_PARAM = "nettoyageclim.parametres", CLE_SAISIE = "nettoyageclim.saisie", CLE_DIST = "nettoyageclim.distances", CLE_PROFIL = "nettoyageclim.profil";

  function lire(cle, defaut) { try { var v = JSON.parse(localStorage.getItem(cle)); return v == null ? defaut : v; } catch (e) { return defaut; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

  var params = Object.assign({}, T.PARAMETRES_DEFAUT, lire(CLE_PARAM, {}));
  var saisieVide = { murale: 0, console: 0, cassette: 0, gainable: 0, exterieures: 0, difficiles: 0, km: null, ville: "", source: "" };
  var saisie = Object.assign({}, saisieVide, lire(CLE_SAISIE, {}));
  var cacheDist = lire(CLE_DIST, {});
  // Profil de l'artisan : ville de départ des distances, signature et mention des messages (onglet Réglages).
  var PROFIL_DEFAUT = { depart: { nom: "Lunel", lat: 43.6757, lng: 4.1356 }, signature: "", mention: "TVA non applicable, art. 293 B du CGI." };
  var profil = Object.assign({}, PROFIL_DEFAUT, lire(CLE_PROFIL, {}));
  function depart() { return profil.depart; }

  // ---------- Compteurs ----------
  function compteur(cle, nom, aide, secondaire) {
    var l = document.createElement("div");
    l.className = "ligne" + (secondaire ? " secondaire" : "");
    l.innerHTML = '<span class="nom">' + nom + (aide ? "<small>" + aide + "</small>" : "") + '</span>' +
      '<span class="compteur"><button type="button" aria-label="Retirer : ' + nom + '">−</button>' +
      '<output aria-label="' + nom + '">0</output><button type="button" aria-label="Ajouter : ' + nom + '">+</button></span>';
    var b = l.querySelectorAll("button"), out = l.querySelector("output");
    b[0].onclick = function () { saisie[cle] = Math.max(0, (saisie[cle] || 0) - 1); maj(); };
    b[1].onclick = function () { saisie[cle] = Math.min(20, (saisie[cle] || 0) + 1); maj(); };
    out.dataset.cle = cle;
    return l;
  }
  T.TYPES.forEach(function (t) {
    $("interieures").appendChild(compteur(t.cle, t.nom, T.euros(params[t.cle]) + " l'unité"));
  });
  $("exterieures").appendChild(compteur("exterieures", "Groupes extérieurs", T.euros(params.exterieure) + " le groupe"));
  $("exterieures").appendChild(compteur("difficiles", "dont accès difficile", "+ " + T.euros(params.accesDifficile) + " par groupe", true));

  function rafraichirAides() {
    var aides = document.querySelectorAll(".ligne .nom small");
    T.TYPES.forEach(function (t, i) { aides[i].textContent = T.euros(params[t.cle]) + " l'unité"; });
    aides[4].textContent = T.euros(params.exterieure) + " le groupe";
    aides[5].textContent = "+ " + T.euros(params.accesDifficile) + " par groupe";
  }

  // ---------- Calcul et affichage ----------
  function maj() {
    if (saisie.difficiles > saisie.exterieures) saisie.difficiles = saisie.exterieures;
    document.querySelectorAll("output[data-cle]").forEach(function (o) { o.textContent = saisie[o.dataset.cle] || 0; });
    var r = T.calculer(saisie, params);
    $("prix").textContent = T.euros(r.prix);
    $("resume").textContent = r.nbUI || r.nbUE ? resume(r) : "Saisis les unités";
    var h = r.lignes.map(function (l) {
      return '<div' + (l.montant < 0 ? ' class="remise"' : "") + '><span>' + l.libelle + '</span><span>' + T.euros(l.montant) + '</span></div>';
    }).join("");
    if (r.lignes.length && r.totalCalcule !== r.prix) h += '<div class="total"><span>Total ' + T.euros(r.totalCalcule) + ', arrondi à</span><span>' + T.euros(r.prix) + '</span></div>';
    $("detail").innerHTML = h;
    var a = r.alertes.slice();
    if ((r.nbUI || r.nbUE) && !r.kmConnu) a.push("Ville non renseignée : déplacement compté comme compris (moins de " + params.seuilKm + " km).");
    $("alertes").innerHTML = a.map(function (t) { return '<p class="alerte">' + t + "</p>"; }).join("");
    $("partager").disabled = $("copier").disabled = !r.prix;
    afficherDistance();
    ecrire(CLE_SAISIE, saisie);
    return r;
  }

  function resume(r) {
    var parts = [];
    if (r.nbUI) parts.push(r.nbUI + " UI");
    if (r.nbUE) parts.push(r.nbUE + " UE");
    if (saisie.ville) parts.push(saisie.ville);
    return parts.join(" · ");
  }

  // ---------- Ville et distance ----------
  var minuterie = null, demande = 0;
  $("ville").value = saisie.ville || "";
  $("km").value = saisie.km == null ? "" : saisie.km;

  $("ville").addEventListener("input", function () {
    var q = this.value.trim();
    clearTimeout(minuterie);
    if (q.length < 2) { $("suggestions").innerHTML = ""; return; }
    minuterie = setTimeout(function () { chercherVille(q); }, 250);
  });

  function chercherVille(q) {
    var n = ++demande;
    var url = "https://api-adresse.data.gouv.fr/search/?type=municipality&autocomplete=1&limit=6&lat=" + depart().lat + "&lon=" + depart().lng + "&q=" + encodeURIComponent(q);
    fetch(url).then(function (rep) { return rep.json(); }).then(function (d) {
      if (n !== demande) return;
      var box = $("suggestions");
      box.innerHTML = "";
      (d.features || []).forEach(function (f) {
        var p = f.properties, c = f.geometry.coordinates;
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("role", "option");
        b.innerHTML = p.city + "<small>" + p.postcode + "</small>";
        b.onclick = function () { choisirVille(p.city, p.postcode, { lat: c[1], lng: c[0] }); };
        box.appendChild(b);
      });
      if (!box.children.length) box.innerHTML = '<button type="button" disabled>Aucune ville trouvée</button>';
    }).catch(function () {
      if (n === demande) $("suggestions").innerHTML = '<button type="button" disabled>Pas de réseau : saisis les km à la main</button>';
    });
  }

  function choisirVille(nom, cp, pos) {
    $("suggestions").innerHTML = "";
    $("ville").value = nom;
    saisie.ville = nom;
    var cle = depart().nom + ">" + nom + " " + cp;
    if (cacheDist[cle]) { fixerKm(cacheDist[cle].km, cacheDist[cle].source); return; }
    $("distance").textContent = "Calcul de la distance…";
    var url = "https://router.project-osrm.org/route/v1/driving/" + depart().lng + "," + depart().lat + ";" + pos.lng + "," + pos.lat + "?overview=false";
    var fini = false;
    var repli = setTimeout(function () { if (!fini) { fini = true; estimation(); } }, 6000);
    function estimation() { fixerKm(Math.round(T.volOiseau(depart(), pos) * 1.25), "estimée"); }
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (fini) return; fini = true; clearTimeout(repli);
      if (d.routes && d.routes[0]) {
        var km = Math.round(d.routes[0].distance / 1000);
        cacheDist[cle] = { km: km, source: "route" }; ecrire(CLE_DIST, cacheDist);
        fixerKm(km, "route");
      } else estimation();
    }).catch(function () { if (!fini) { fini = true; clearTimeout(repli); estimation(); } });
  }

  function fixerKm(km, source) {
    saisie.km = km; saisie.source = source;
    $("km").value = km;
    maj();
  }

  $("km").addEventListener("input", function () {
    var v = this.value === "" ? null : Math.max(0, Number(this.value));
    saisie.km = isNaN(v) ? null : v; saisie.source = "manuelle";
    maj();
  });
  $("ville").addEventListener("change", function () { saisie.ville = this.value.trim(); ecrire(CLE_SAISIE, saisie); });

  function afficherDistance() {
    var el = $("distance");
    if (saisie.km == null) { el.textContent = "Distance non renseignée : déplacement compté comme compris."; return; }
    var src = { route: "par la route", "estimée": "estimée (sans réseau routier)", manuelle: "saisie à la main" }[saisie.source] || "";
    var hors = saisie.km > params.seuilKm;
    el.innerHTML = (saisie.ville ? saisie.ville + " : " : "") + "<b>" + saisie.km + " km</b> " + src +
      '<span class="pastille' + (hors ? " hors" : "") + '">' + (hors ? "+ " + T.euros(params.supplementKm) : "compris") + "</span>";
  }

  // ---------- Partage ----------
  function texteClient() {
    var r = T.calculer(saisie, params);
    var lignes = ["Bonjour,", "", "Voici l'estimation pour le nettoyage / entretien de votre climatisation" + (saisie.ville ? " (" + saisie.ville + ")" : "") + " :", ""];
    r.lignes.forEach(function (l) { lignes.push("• " + l.libelle + " : " + T.euros(l.montant)); });
    lignes.push("", "Prix estimé : " + T.euros(r.prix) + " TTC");
    if (profil.mention.trim()) lignes.push(profil.mention.trim());
    lignes.push("Estimation indicative, confirmée sur place selon l'installation.");
    if (profil.signature.trim()) lignes.push("", profil.signature.trim());
    return lignes.join("\n").replace(/ /g, " ");
  }

  $("partager").onclick = function () {
    var texte = texteClient();
    var share = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (share) { share.share({ title: "Estimation entretien climatisation", text: texte, dialogTitle: "Envoyer l'estimation" }).catch(function () {}); }
    else if (navigator.share) { navigator.share({ text: texte }).catch(function () {}); }
    else copier(texte);
  };
  $("copier").onclick = function () { copier(texteClient()); };

  function copier(texte) {
    var fin = function () { toast("Estimation copiée"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fin, function () { copieSecours(texte); fin(); });
    else { copieSecours(texte); fin(); }
  }
  function copieSecours(texte) {
    var t = document.createElement("textarea"); t.value = texte; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {} t.remove();
  }

  var minuterieToast;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("visible");
    clearTimeout(minuterieToast); minuterieToast = setTimeout(function () { t.classList.remove("visible"); }, 2200);
  }

  $("raz").onclick = function () {
    saisie = Object.assign({}, saisieVide);
    $("ville").value = ""; $("km").value = ""; $("suggestions").innerHTML = "";
    maj(); toast("Saisie effacée");
  };

  // ---------- Réglages ----------
  var CHAMPS = [
    ["forfait", "Forfait intervention", "prise en charge, protection, contrôle, fiche", "€"],
    ["murale", "Unité intérieure murale", "", "€"],
    ["console", "Unité intérieure console", "", "€"],
    ["cassette", "Unité intérieure cassette", "", "€"],
    ["gainable", "Unité intérieure gainable", "", "€"],
    ["exterieure", "Groupe extérieur", "par groupe", "€"],
    ["accesDifficile", "Accès difficile", "par groupe extérieur", "€"],
    ["remise", "Remise dégressive", "sur chaque unité intérieure au-delà de la 2e", "%"],
    ["seuilKm", "Déplacement compris jusqu'à", "depuis la ville de départ", "km"],
    ["supplementKm", "Supplément au-delà", "", "€"],
    ["arrondi", "Arrondir le prix au multiple de", "", "€"]
  ];
  function remplirReglages() {
    $("reglages").innerHTML = CHAMPS.map(function (c) {
      var v = c[0] === "remise" ? Math.round(params[c[0]] * 1000) / 10 : params[c[0]];
      return '<div class="reglage"><label for="p-' + c[0] + '">' + c[1] + (c[2] ? "<small>" + c[2] + "</small>" : "") + '</label>' +
        '<span class="saisie"><input id="p-' + c[0] + '" type="number" inputmode="decimal" min="0" step="any" value="' + v + '"><span class="unite">' + c[3] + "</span></span></div>";
    }).join("");
  }
  $("enregistrer").onclick = function () {
    var nouveaux = {};
    for (var i = 0; i < CHAMPS.length; i++) {
      var c = CHAMPS[i], v = Number($("p-" + c[0]).value);
      if ($("p-" + c[0]).value === "" || isNaN(v) || v < 0) { $("etat-reglages").textContent = "Valeur invalide : " + c[1]; $("p-" + c[0]).focus(); return; }
      nouveaux[c[0]] = c[0] === "remise" ? v / 100 : v;
    }
    params = Object.assign({}, T.PARAMETRES_DEFAUT, nouveaux);
    ecrire(CLE_PARAM, params);
    rafraichirAides(); maj();
    $("etat-reglages").textContent = "";
    toast("Prix enregistrés");
  };
  $("defaut").onclick = function () {
    params = Object.assign({}, T.PARAMETRES_DEFAUT);
    ecrire(CLE_PARAM, params);
    remplirReglages(); rafraichirAides(); maj();
    toast("Prix de la grille rétablis");
  };

  // ---------- Profil (ville de départ, signature, mention) ----------
  function remplirProfil() {
    $("depart").value = profil.depart.nom;
    $("signature").value = profil.signature;
    $("mention").value = profil.mention;
    $("libelle-km").textContent = "Distance depuis " + profil.depart.nom + " (km, modifiable)";
  }
  var minutDepart = null;
  $("depart").addEventListener("input", function () {
    var q = this.value.trim(); clearTimeout(minutDepart);
    if (q.length < 2) { $("suggestions-depart").innerHTML = ""; return; }
    minutDepart = setTimeout(function () {
      fetch("https://api-adresse.data.gouv.fr/search/?type=municipality&autocomplete=1&limit=5&q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); }).then(function (d) {
          var box = $("suggestions-depart"); box.innerHTML = "";
          (d.features || []).forEach(function (f) {
            var b = document.createElement("button"); b.type = "button";
            b.innerHTML = f.properties.city + "<small>" + f.properties.postcode + "</small>";
            b.onclick = function () {
              profil.depart = { nom: f.properties.city, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
              ecrire(CLE_PROFIL, profil); box.innerHTML = ""; remplirProfil(); toast("Ville de départ : " + profil.depart.nom);
            };
            box.appendChild(b);
          });
        }).catch(function () { $("suggestions-depart").innerHTML = '<button type="button" disabled>Pas de réseau</button>'; });
    }, 250);
  });
  ["signature", "mention"].forEach(function (k) {
    $(k).addEventListener("change", function () { profil[k] = this.value; ecrire(CLE_PROFIL, profil); toast("Enregistré"); });
  });
  remplirProfil();

  // ---------- Onglets ----------
  document.querySelectorAll(".onglets button").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll(".onglets button").forEach(function (x) { x.removeAttribute("aria-current"); });
      b.setAttribute("aria-current", "page");
      $("vue-estimation").classList.toggle("cachee", b.dataset.vue !== "estimation");
      $("vue-reglages").classList.toggle("cachee", b.dataset.vue !== "reglages");
      $("raz").classList.toggle("cachee", b.dataset.vue !== "estimation");
      if (b.dataset.vue === "reglages") { remplirReglages(); remplirProfil(); }
      window.scrollTo(0, 0);
    };
  });

  maj();
})();
