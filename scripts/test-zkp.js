// scripts/test-zkp.js
const snarkjs = require('snarkjs');
const fs = require('fs');
const crypto = require('crypto');

async function generateProof(userId, fileId, accessType, accessRightHash) {
    console.log(`\nGénération d'une preuve pour:`);
    console.log(`- userId: ${userId}`);
    console.log(`- fileId: ${fileId}`);
    console.log(`- accessType: ${accessType} (${accessType === 0 ? 'lecture' : 'écriture'})`);
    console.log(`- accessRightHash: ${accessRightHash}`);
    
    // Préparer les inputs pour le circuit
    const input = {
        userId: userId,
        fileId: fileId,
        accessType: accessType,
        accessRightHash: accessRightHash
    };
    
    try {
        // Générer la preuve
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            'build/circuits/FileAccessVerifier_js/FileAccessVerifier.wasm',
            'build/circuits/FileAccessVerifier_0001.zkey'
        );
        
        console.log('✅ Preuve générée avec succès!');
        console.log('Signaux publics:', publicSignals);
        
        // Sauvegarder la preuve et les signaux publics
        fs.writeFileSync('build/circuits/proof.json', JSON.stringify(proof, null, 2));
        fs.writeFileSync('build/circuits/public.json', JSON.stringify(publicSignals, null, 2));
        
        return { proof, publicSignals };
    } catch (error) {
        console.error('❌ Erreur lors de la génération de la preuve:', error);
        throw error;
    }
}

async function verifyProof(proof, publicSignals) {
    try {
        console.log('\nVérification de la preuve...');
        
        // Charger la clé de vérification
        const vKey = JSON.parse(fs.readFileSync('build/circuits/verification_key.json'));
        
        // Vérifier la preuve
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        console.log(`Résultat de la vérification: ${isValid ? '✅ Valide' : '❌ Invalide'}`);
        
        return isValid;
    } catch (error) {
        console.error('❌ Erreur lors de la vérification de la preuve:', error);
        throw error;
    }
}

async function generateHash(userId, fileId, accessType) {
    try {
        // Utiliser le circuit pour calculer le hash Poseidon
        console.log('\nCalibration du hash Poseidon...');
        
        // On crée un input temporaire
        const input = {
            userId: userId,
            fileId: fileId,
            accessType: accessType,
            // La valeur du hash n'est pas importante ici, car on cherche juste à calculer le hash
            accessRightHash: '0' 
        };
        
        // Utiliser un circuit séparé pour calculer le hash Poseidon
        // Note: Si cela échoue, nous utiliserons une alternative avec SHA-256
        try {
            console.log('Tentative de calcul avec le circuit...');
            const { witness } = await snarkjs.wtns.calculate(
                input,
                'build/circuits/FileAccessVerifier_js/FileAccessVerifier.wasm',
                'build/circuits/FileAccessVerifier_js/FileAccessVerifier.sym'
            );
            
            // Extraire la valeur du hash calculé (à déterminer selon la structure du circuit)
            // C'est une simplification, l'extraction réelle dépend de la structure du circuit
            const hash = witness[2]; // Index à ajuster
            
            console.log('Hash Poseidon calculé:', hash.toString());
            return hash.toString();
        } catch (error) {
            console.warn('Impossible de calculer le hash avec le circuit, utilisation de SHA-256 comme fallback');
            
            // Utiliser SHA-256 comme fallback
            const shaObj = crypto.createHash('sha256');
            shaObj.update(`${userId}${fileId}${accessType}`);
            const hash = BigInt('0x' + shaObj.digest('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
            
            console.log('Hash SHA-256 (fallback) calculé:', hash.toString());
            return hash.toString();
        }
    } catch (error) {
        console.error('❌ Erreur lors du calcul du hash:', error);
        throw error;
    }
}

async function testFullZkpFlow() {
    try {
        console.log('=== Test complet du flux ZKP ===');
        
        // Exemple de données
        const userId = 42;
        const fileId = 123;
        const accessType = 1; // 1 pour écriture
        
        // Calculer le hash pour le droit d'accès
        console.log('\nCalcul du hash pour le droit d\'accès...');
        const accessRightHash = await generateHash(userId, fileId, accessType);
        
        // Ce hash serait normalement stocké sur la blockchain
        console.log(`\nLe hash ${accessRightHash} serait stocké sur la blockchain`);
        console.log('Il représente le droit d\'accès de l\'utilisateur 42 au fichier 123 en mode écriture');
        
        // Génération de la preuve
        const { proof, publicSignals } = await generateProof(userId, fileId, accessType, accessRightHash);
        
        // Vérification de la preuve
        const isValid = await verifyProof(proof, publicSignals);
        
        if (isValid) {
            console.log('\n✅ Le test complet a réussi!');
            console.log('Cela signifie que:');
            console.log('1. Un hash représentant le droit d\'accès a été calculé');
            console.log('2. Une preuve a été générée montrant que l\'utilisateur connaît les valeurs privées');
            console.log('3. Cette preuve a été vérifiée sans révéler les valeurs privées');
            console.log('\nDans un système réel:');
            console.log('- Le hash serait stocké sur la blockchain');
            console.log('- L\'utilisateur générerait une preuve localement');
            console.log('- Le contrat intelligent vérifierait cette preuve');
            console.log('- L\'utilisateur pourrait ainsi accéder au fichier sans révéler son identité');
        } else {
            console.log('\n❌ Le test a échoué à l\'étape de vérification');
        }
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test complet:', error);
    }
}

// Exécuter le test
testFullZkpFlow();
