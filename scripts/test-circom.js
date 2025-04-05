const snarkjs = require("snarkjs");

async function main() {
  try {
    console.log("✅ snarkjs est correctement installé");
    
    // Vérifier si snarkjs est fonctionnel en affichant des informations sur l'objet
    console.log("Fonctions snarkjs disponibles:", Object.keys(snarkjs).join(", "));
    
    // Tester l'accès à circomlib
    try {
      const circomlib = require("circomlib");
      console.log("✅ circomlib est correctement installé");
      console.log("Composants circomlib disponibles:", Object.keys(circomlib).join(", "));
    } catch (error) {
      console.error("❌ Erreur avec circomlib:", error.message);
    }
  } catch (error) {
    console.error("❌ Erreur lors du test de snarkjs:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
