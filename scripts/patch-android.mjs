// Prépare le projet Android généré par Capacitor : signature fixe et numéro de version.
import fs from "node:fs";

// Signature fixe : chaque nouvelle version s'installe PAR-DESSUS l'ancienne (sans désinstaller).
const gradle = "android/app/build.gradle";
let g = fs.readFileSync(gradle, "utf8");
if (!g.includes("nettoyage-clim.keystore")) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        debug {
            storeFile file('../../signature/nettoyage-clim.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`);
  console.log("Signature fixe ajoutée (signature/nettoyage-clim.keystore).");
}

// Numéro de version croissant (numéro de compilation GitHub) : Android accepte toujours la mise à jour.
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const numero = Number(process.env.GITHUB_RUN_NUMBER || 1);
g = g.replace(/versionCode\s+\d+/, `versionCode ${numero}`).replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
fs.writeFileSync(gradle, g);
console.log(`Version Android : ${pkg.version} (code ${numero}).`);
