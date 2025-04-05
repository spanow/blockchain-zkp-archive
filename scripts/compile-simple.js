// scripts/compile-simple.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
    try {
        console.log('Compilation du circuit ZKP (version simplifiée)...');
        
        // S'assurer que les répertoires existent
        if (!fs.existsSync('build')) {
            fs.mkdirSync('build');
        }
        if (!fs.existsSync('build/circuits')) {
            fs.mkdirSync('build', { recursive: true });
        }
        
        // Compilation du circuit avec Circom - chemin explicite
        console.log('Étape 1: Compilation du circuit avec Circom');
        // Essayons d'abord sans l'option -l pour voir si les chemins relatifs fonctionnent
        execSync('circom circuits/FileAccessVerifier.circom --r1cs --wasm --sym -o build/circuits');
        
        console.log('Circuit compilé avec succès!');
        console.log('Vérification des fichiers générés:');
        execSync('ls -la build/circuits', { stdio: 'inherit' });
        
    } catch (error) {
        console.error('Erreur lors de la compilation du circuit:', error);
        
        // Affichons plus d'information sur l'erreur exacte
        if (error.stderr) {
            console.error('Message d\'erreur détaillé:');
            console.error(error.stderr.toString());
        }
        
        process.exit(1);
    }
}

main().then(() => {
    console.log('Compilation terminée avec succès!');
    process.exit(0);
}).catch(err => {
    console.error('Erreur non gérée:', err);
    process.exit(1);
});
