// scripts/generate-ptau.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
    try {
        console.log('=== Génération locale des paramètres Powers of Tau ===');
        
        // S'assurer que le répertoire existe
        if (!fs.existsSync('build/circuits')) {
            fs.mkdirSync('build/circuits', { recursive: true });
        }
        
        // Générer un fichier ptau de taille plus petite
        console.log('\nGénération d\'un fichier ptau (cela peut prendre quelques minutes)...');
        
        // Utiliser la ligne de commande snarkjs pour créer un nouveau ptau
        // Nous utilisons une petite taille (12) pour que ce soit rapide
        execSync('npx snarkjs powersoftau new bn128 12 build/circuits/pot12_0000.ptau -v', { stdio: 'inherit' });
        execSync('npx snarkjs powersoftau contribute build/circuits/pot12_0000.ptau build/circuits/pot12_0001.ptau --name="First contribution" -v', { stdio: 'inherit' });
        execSync('npx snarkjs powersoftau prepare phase2 build/circuits/pot12_0001.ptau build/circuits/pot12_final.ptau -v', { stdio: 'inherit' });
        
        console.log('\n✅ Fichier ptau généré avec succès: build/circuits/pot12_final.ptau');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la génération du fichier ptau:', error);
        process.exit(1);
    }
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
