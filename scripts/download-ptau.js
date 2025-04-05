// scripts/download-ptau.js
const fs = require('fs');
const https = require('https');
const path = require('path');

const PTAU_URL = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau';
const OUTPUT_PATH = path.join('build', 'circuits', 'pot12_0000.ptau');

// S'assurer que le répertoire existe
if (!fs.existsSync('build/circuits')) {
    fs.mkdirSync('build/circuits', { recursive: true });
}

console.log(`Téléchargement du fichier ptau depuis ${PTAU_URL}...`);
console.log(`Cela peut prendre un moment, veuillez patienter...`);

const file = fs.createWriteStream(OUTPUT_PATH);

https.get(PTAU_URL, function(response) {
    // Vérifier si la réponse est valide
    if (response.statusCode !== 200) {
        console.error(`Échec du téléchargement. Code de statut: ${response.statusCode}`);
        fs.unlinkSync(OUTPUT_PATH); // Supprimer le fichier partiel
        process.exit(1);
        return;
    }

    // Obtenir la taille totale
    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;
    let lastPercentReported = 0;

    // Afficher la progression du téléchargement
    response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        
        // Afficher tous les 10%
        if (percent >= lastPercentReported + 10) {
            console.log(`Téléchargement: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
            lastPercentReported = percent - (percent % 10); // Arrondir au plus proche multiple de 10
        }
    });

    // Écrire le fichier
    response.pipe(file);

    file.on('finish', function() {
        file.close(() => {
            console.log(`Téléchargement terminé! Fichier sauvegardé à: ${OUTPUT_PATH}`);
            process.exit(0);
        });
    });
}).on('error', function(err) {
    // Supprimer le fichier partiel en cas d'erreur
    fs.unlinkSync(OUTPUT_PATH);
    console.error(`Erreur de téléchargement: ${err.message}`);
    process.exit(1);
});
