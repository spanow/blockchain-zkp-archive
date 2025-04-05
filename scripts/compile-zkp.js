// scripts/compile-zkp-fixed.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
    try {
        console.log('=== Compilation du circuit ZKP et génération des clés (version corrigée) ===');
        
        // S'assurer que les répertoires existent
        if (!fs.existsSync('build')) {
            fs.mkdirSync('build');
        }
        if (!fs.existsSync('build/circuits')) {
            fs.mkdirSync('build/circuits', { recursive: true });
        }
        
        // Étape 1: Compilation du circuit avec Circom
        console.log('\nÉtape 1: Compilation du circuit avec Circom');
        execSync('circom circuits/FileAccessVerifier.circom --r1cs --wasm --sym -o build/circuits', { stdio: 'inherit' });
        console.log('✅ Circuit compilé avec succès!');
        
        // Vérifier les fichiers générés
        console.log('\nFichiers générés:');
        execSync('ls -la build/circuits', { stdio: 'inherit' });
        
        // Étape 2: Vérifier si le fichier ptau existe, sinon le télécharger
        const ptauPath = path.join('build', 'circuits', 'pot12_0000.ptau');
        if (!fs.existsSync(ptauPath)) {
            console.log('\nÉtape 2: Téléchargement du fichier ptau');
            console.log('Le fichier ptau n\'existe pas, veuillez d\'abord exécuter:');
            console.log('node scripts/download-ptau.js');
            console.log('Puis relancez ce script.');
            return;
        }
        
        console.log('\nÉtape 3: Génération des clés spécifiques au circuit');
        // Utiliser snarkjs en ligne de commande
        execSync('npx snarkjs groth16 setup build/circuits/FileAccessVerifier.r1cs build/circuits/pot12_0000.ptau build/circuits/FileAccessVerifier_0000.zkey', { stdio: 'inherit' });
        execSync('echo "test contribution" | npx snarkjs zkey contribute build/circuits/FileAccessVerifier_0000.zkey build/circuits/FileAccessVerifier_0001.zkey', { stdio: 'inherit' });
        console.log('✅ Clés de circuit générées avec succès!');
        
        // Étape 4: Exportation de la clé de vérification
        console.log('\nÉtape 4: Exportation de la clé de vérification');
        execSync('npx snarkjs zkey export verificationkey build/circuits/FileAccessVerifier_0001.zkey build/circuits/verification_key.json', { stdio: 'inherit' });
        console.log('✅ Clé de vérification exportée avec succès!');
        
        // Étape 5: Génération du contrat de vérificateur Solidity
        console.log('\nÉtape 5: Génération du contrat vérificateur Solidity');
        execSync('npx snarkjs zkey export solidityverifier build/circuits/FileAccessVerifier_0001.zkey contracts/FileAccessVerifier.sol', { stdio: 'inherit' });
        console.log('✅ Contrat vérificateur généré avec succès!');
        
        console.log('\n=== Configuration ZKP terminée avec succès! ===');
        console.log('Fichiers générés:');
        console.log('- Contrat vérificateur: contracts/FileAccessVerifier.sol');
        console.log('- Clé de vérification: build/circuits/verification_key.json');
        console.log('- Clé de preuve: build/circuits/FileAccessVerifier_0001.zkey');
        console.log('- Circuit WASM: build/circuits/FileAccessVerifier_js/FileAccessVerifier.wasm');
        
    } catch (error) {
        console.error('❌ Erreur lors de la configuration ZKP:', error);
        process.exit(1);
    }
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
