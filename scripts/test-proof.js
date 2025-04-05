const snarkjs = require('snarkjs');
const fs = require('fs');
const crypto = require('crypto');

async function generateProof(userId, fileId, accessType, accessRightHash) {
    try {
        // Préparer les inputs pour le circuit
        const input = {
            userId: userId,
            fileId: fileId,
            accessType: accessType,
            accessRightHash: accessRightHash
        };
        
        console.log('Génération de la preuve avec les inputs:', input);
        
        // Générer la preuve
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            'build/circuits/FileAccessVerifier_js/FileAccessVerifier.wasm',
            'build/circuits/FileAccessVerifier_0001.zkey'
        );
        
        console.log('Preuve générée avec succès!');
        console.log('Signaux publics:', publicSignals);
        
        // Sauvegarder la preuve dans un fichier
        fs.writeFileSync('build/proof.json', JSON.stringify(proof, null, 2));
        fs.writeFileSync('build/public.json', JSON.stringify(publicSignals, null, 2));
        
        return { proof, publicSignals };
    } catch (error) {
        console.error('Erreur lors de la génération de la preuve:', error);
        throw error;
    }
}

async function verifyProof(proof, publicSignals) {
    try {
        console.log('Vérification de la preuve...');
        
        // Charger la clé de vérification
        const vKey = JSON.parse(fs.readFileSync('build/circuits/verification_key.json'));
        
        // Vérifier la preuve
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        console.log('Résultat de la vérification:', isValid ? 'Valide ✓' : 'Invalide ✗');
        
        return isValid;
    } catch (error) {
        console.error('Erreur lors de la vérification de la preuve:', error);
        throw error;
    }
}

// Fonction pour simuler le calcul du hash Poseidon
// Dans un environnement réel, cela serait fait directement avec la bibliothèque poseidon
async function simulatePoseidonHash(userId, fileId, accessType) {
    try {
        // Créer un input temporaire
        const input = {
            userId: userId,
            fileId: fileId,
            accessType: accessType,
            accessRightHash: 0 // valeur temporaire
        };
        
        // Utiliser le circuit pour calculer le hash
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            'build/circuits/FileAccessVerifier_js/FileAccessVerifier.wasm',
            'build/circuits/FileAccessVerifier_0001.zkey'
        );
        
        // Le publicSignals[0] contient le hash calculé
        return publicSignals[0];
    } catch (error) {
        console.error('Erreur lors du calcul du hash Poseidon:', error);
        
        // Fallback: utiliser un hash différent (SHA-256)
        // Attention: ceci est juste pour le test, pas pour la production
        console.log('Utilisation du fallback avec SHA-256 (pour test uniquement)');
        const shaObj = crypto.createHash('sha256');
        shaObj.update(`${userId}${fileId}${accessType}`);
        const hash = BigInt('0x' + shaObj.digest('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        return hash.toString();
    }
}

// Fonction pour tester tout le flux
async function testProofGeneration() {
    try {
        console.log('=== Test de génération et vérification de preuve ZKP ===');
        
        // Exemple de données
        const userId = 42;
        const fileId = 123;
        const accessType = 1; // 1 pour écriture
        
        // Calculer le hash pour le droit d'accès
        console.log('Calcul du hash Poseidon pour le droit d\'accès...');
        const accessRightHash = await simulatePoseidonHash(userId, fileId, accessType);
        console.log('Hash du droit d\'accès calculé:', accessRightHash);
        
        // Générer la preuve
        console.log('\nGénération de la preuve...');
        const { proof, publicSignals } = await generateProof(userId, fileId, accessType, accessRightHash);
        
        // Vérifier la preuve
        console.log('\nVérification de la preuve...');
        const isValid = await verifyProof(proof, publicSignals);
        
        if (isValid) {
            console.log('\n✅ Test réussi: La preuve a été générée et vérifiée avec succès');
            console.log('Cela signifie que:');
            console.log('- L\'utilisateur peut prouver qu\'il a le droit d\'accéder au fichier');
            console.log('- Sans révéler son identité (userId = 42)');
            console.log('- Sans révéler le fichier accédé (fileId = 123)');
            console.log('- En prouvant qu\'il a le droit d\'écriture (accessType = 1)');
        } else {
            console.log('\n❌ Test échoué: La vérification de la preuve a échoué');
        }
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

// Exécuter le test
testProofGeneration().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
