pragma circom 2.0.0;

// Utilisation des chemins qui fonctionnent avec notre installation
include "../circomlib/circuits/comparators.circom";
include "../circomlib/circuits/poseidon.circom";

/*
 * Circuit qui prouve qu'un utilisateur a le droit d'accéder à un fichier
 * sans révéler son identité ou les détails du fichier
 */
template FileAccessVerifier() {
    // Entrées privées (connues seulement du prouveur)
    signal input userId;
    signal input fileId;
    signal input accessType; // 0: lecture, 1: écriture
    
    // Entrée publique (connue de tous)
    signal input accessRightHash;
    
    // Sortie
    signal output verified;
    
    // Vérification que accessType est soit 0 (lecture) soit 1 (écriture)
    component isValidAccess = LessThan(2);
    isValidAccess.in[0] <== accessType;
    isValidAccess.in[1] <== 2;
    
    // Calcul du hash des informations d'accès avec Poseidon
    component hasher = Poseidon(3);
    hasher.inputs[0] <== userId;
    hasher.inputs[1] <== fileId;
    hasher.inputs[2] <== accessType;
    
    // Vérification que le hash calculé correspond au hash attendu
    component hashVerifier = IsEqual();
    hashVerifier.in[0] <== hasher.out;
    hashVerifier.in[1] <== accessRightHash;
    
    // La vérification est réussie si le type d'accès est valide ET le hash correspond
    verified <== isValidAccess.out * hashVerifier.out;
}

component main { public [accessRightHash] } = FileAccessVerifier();
