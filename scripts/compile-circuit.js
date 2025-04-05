const fs = require('fs');
const { execSync } = require('child_process');
const snarkjs = require('snarkjs');
const path = require('path');

async function main() {
    try {
        console.log('Compilation du circuit ZKP...');
        
        // S'assurer que les répertoires existent
        if (!fs.existsSync('build')) {
            fs.mkdirSync('build');
        }
        if (!fs.existsSync('build/circuits')) {
            fs.mkdirSync('build/circuits');
        }
        
        // Compilation du circuit avec Circom
        console.log('Étape 1: Compile le circuit avec Circom');
        execSync('circom circuits/FileAccessVerifier.circom --r1cs --wasm --sym -o build/circuits');
        console.log('Circuit compilé avec succès!');
        
        // Chemin vers les fichiers générés
        const circuitWasmPath = path.join('build', 'circuits', 'FileAccessVerifier_js', 'FileAccessVerifier.wasm');
        const circuitR1csPath = path.join('build', 'circuits', 'FileAccessVerifier.r1cs');
        
        // Générer les paramètres "powers of tau" (phase 1 de la cérémonie de configuration)
        console.log('Étape 2: Génération des paramètres powers of tau');
        await snarkjs.powersOfTau.newAccumulator(12, 'build/circuits/pot12_0000.ptau');
        await snarkjs.powersOfTau.contribute('build/circuits/pot12_0000.ptau', 'build/circuits/pot12_0001.ptau', 'Premier contributeur', 'Entropie aléatoire');
        await snarkjs.powersOfTau.preparePhase2('build/circuits/pot12_0001.ptau', 'build/circuits/pot12_final.ptau');
        
        // Génération des clés de vérification (phase 2 de la cérémonie)
        console.log('Étape 3: Génération des clés de preuve et de vérification');
        await snarkjs.groth16.setup(circuitR1csPath, 'build/circuits/pot12_final.ptau', 'build/circuits/FileAccessVerifier_0000.zkey');
        await snarkjs.zKey.contribute('build/circuits/FileAccessVerifier_0000.zkey', 'build/circuits/FileAccessVerifier_0001.zkey', 'Contributeur', 'Nouvelle entropie');
        await snarkjs.zKey.exportVerificationKey('build/circuits/FileAccessVerifier_0001.zkey', 'build/circuits/verification_key.json');
        
        // Génération du contrat de vérificateur Solidity
        console.log('Étape 4: Génération du contrat vérificateur Solidity');
        const verifierCode = await snarkjs.zKey.exportSolidityVerifier('build/circuits/FileAccessVerifier_0001.zkey', { 
            verifierName: 'FileAccessVerifier'
        });
        fs.writeFileSync('contracts/FileAccessVerifier.sol', verifierCode);
        
        console.log('Compilation et configuration du circuit terminées avec succès!');
        console.log('Fichiers générés:');
        console.log('- Contrat vérificateur: contracts/FileAccessVerifier.sol');
        console.log('- Clé de vérification: build/circuits/verification_key.json');
        console.log('- Clé ZK: build/circuits/FileAccessVerifier_0001.zkey');
        
    } catch (error) {
        console.error('Erreur lors de la compilation du circuit:', error);
        process.exit(1);
    }
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
