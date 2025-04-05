const fs = require('fs');
const path = require('path');
const https = require('https');

const CIRCOMLIB_BASE_URL = 'https://raw.githubusercontent.com/iden3/circomlib/master/circuits/';
const CIRCUITS_DIR = path.join(__dirname, '../node_modules/circomlib/circuits');

// Liste des fichiers de base nécessaires
const files = [
  'comparators.circom',
  'poseidon.circom',
  'bitify.circom',
  'gates.circom',
  'mimcsponge.circom',
  'mux1.circom',
  'mux2.circom',
  'mux3.circom',
  'mux4.circom',
  'babyjub.circom'
];

// Vérifier et créer le répertoire si nécessaire
if (!fs.existsSync(CIRCUITS_DIR)) {
  fs.mkdirSync(CIRCUITS_DIR, { recursive: true });
  console.log(`Répertoire créé: ${CIRCUITS_DIR}`);
}

// Fonction pour télécharger un fichier
function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(CIRCUITS_DIR, filename);
    const fileUrl = `${CIRCOMLIB_BASE_URL}${filename}`;
    
    console.log(`Téléchargement de ${fileUrl}...`);
    
    const file = fs.createWriteStream(targetPath);
    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Échec du téléchargement: ${response.statusCode} - ${fileUrl}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Fichier téléchargé avec succès: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(targetPath, () => {}); // Supprimer le fichier partiellement téléchargé
      reject(err);
    });
  });
}

// Télécharger tous les fichiers
async function downloadAllFiles() {
  try {
    console.log('Début du téléchargement des circuits circomlib...');
    
    for (const file of files) {
      await downloadFile(file);
    }
    
    console.log('Tous les fichiers circomlib ont été téléchargés avec succès!');
  } catch (error) {
    console.error('Erreur lors du téléchargement des circuits:', error);
    process.exit(1);
  }
}

// Exécuter le téléchargement
downloadAllFiles();
