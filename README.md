# Nettoyage clim — appli Android

Petite appli pour chiffrer en quelques secondes le **nettoyage / entretien d'une climatisation** et envoyer l'estimation au client.

## Ce que fait l'appli
- **Unités intérieures** par type : murale, console, cassette, gainable.
- **Groupes extérieurs**, dont ceux d'accès difficile (grande échelle, toit).
- **Ville du client** : recherche de la commune (Base Adresse Nationale) et distance par la route depuis ta ville de départ
  (OSRM ; sans réponse, estimation à vol d'oiseau × 1,25). Les km restent modifiables à la main.
- **Prix** détaillé ligne par ligne, arrondi, à **envoyer au client** (SMS, WhatsApp, mail…) ou à copier.
- **Réglages** : ville de départ, signature des messages, mention sous le prix, et tous les prix.
  Tout reste enregistré sur le téléphone.

## Prix par défaut (TTC, modifiables)
Forfait 10 € + 95 € par unité murale (console 105, cassette 130, gainable 160) + 15 € par groupe extérieur,
remise de 10 % sur chaque unité intérieure au-delà de la 2e, + 10 € par groupe d'accès difficile,
+ 15 € au-delà de 30 km, arrondi à 5 €. Exemples : monosplit 120 €, bi-split 215 €, 2 monosplits 230 €.

## Installer sur le téléphone
Ouvrir la page **Releases** du dépôt sur le téléphone, télécharger le dernier `.apk` et l'ouvrir
(autoriser l'installation depuis le navigateur). Les nouvelles versions s'installent par-dessus l'ancienne.
Chaque modification poussée sur `main` est compilée automatiquement par GitHub Actions.
