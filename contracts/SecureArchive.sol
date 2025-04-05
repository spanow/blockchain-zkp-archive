// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./FileAccessVerifier.sol"; // Le contrat généré pour vérifier les preuves ZKP

/**
 * @title SecureArchiveZKP
 * @dev Contrat pour un système d'archivage sécurisé avec ZKP
 */
contract SecureArchiveZKP is Ownable {
    using Counters for Counters.Counter;
    
    // Compteurs pour les IDs
    Counters.Counter private _fileIdCounter;
    Counters.Counter private _userIdCounter;
    
    // Structure pour les fichiers
    struct File {
        uint256 id;
        string ipfsHash;
        uint256 timestamp;
        address owner;
        bool exists;
    }
    
    // Structure pour les utilisateurs
    struct User {
        uint256 id;
        address wallet;
        bool exists;
    }
    
    // Structure pour les droits d'accès
    struct AccessRight {
        uint256 userId;
        uint256 fileId;
        bool canRead;
        bool canWrite;
        uint256 readAccessHash;  // Hash pour accès en lecture (ZKP)
        uint256 writeAccessHash; // Hash pour accès en écriture (ZKP)
        bool exists;
    }
    
    // Mappings
    mapping(uint256 => File) private files;
    mapping(uint256 => User) private users;
    mapping(address => uint256) private walletToUserId;
    mapping(bytes32 => AccessRight) private accessRights;
    mapping(uint256 => mapping(uint256 => bytes32)) private userFileAccessKey;
    
    // Vérificateur ZKP
    FileAccessVerifier private verifier;
    
    // Events
    event UserRegistered(uint256 indexed userId, address wallet);
    event FileAdded(uint256 indexed fileId, string ipfsHash, uint256 timestamp);
    event AccessRightGranted(uint256 indexed userId, uint256 indexed fileId, bool canRead, bool canWrite);
    event FileAccessed(uint256 indexed fileId, uint256 indexed userId, bool isWrite);
    
    /**
     * @dev Constructeur
     * @param _verifier Adresse du contrat vérificateur de preuves ZKP
     */
    constructor(address _verifier) {
        verifier = FileAccessVerifier(_verifier);
    }
    
    /**
     * @dev Enregistre un nouvel utilisateur
     * @return userId L'identifiant du nouvel utilisateur
     */
    function registerUser() external returns (uint256) {
        require(walletToUserId[msg.sender] == 0, "User already registered");
        
        _userIdCounter.increment();
        uint256 newUserId = _userIdCounter.current();
        
        users[newUserId] = User({
            id: newUserId,
            wallet: msg.sender,
            exists: true
        });
        
        walletToUserId[msg.sender] = newUserId;
        
        emit UserRegistered(newUserId, msg.sender);
        
        return newUserId;
    }
    
    /**
     * @dev Ajoute un nouveau fichier à l'archive
     * @param ipfsHash Le hash IPFS du fichier
     * @param readAccessHash Hash pour vérifier l'accès en lecture via ZKP
     * @param writeAccessHash Hash pour vérifier l'accès en écriture via ZKP
     * @return fileId L'identifiant du nouveau fichier
     */
    function addFile(
        string calldata ipfsHash, 
        uint256 readAccessHash, 
        uint256 writeAccessHash
    ) external returns (uint256) {
        uint256 userId = walletToUserId[msg.sender];
        require(userId != 0, "User not registered");
        
        _fileIdCounter.increment();
        uint256 newFileId = _fileIdCounter.current();
        
        files[newFileId] = File({
            id: newFileId,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            owner: msg.sender,
            exists: true
        });
        
        // Accorde automatiquement tous les droits au créateur
        _grantAccess(userId, newFileId, true, true, readAccessHash, writeAccessHash);
        
        emit FileAdded(newFileId, ipfsHash, block.timestamp);
        
        return newFileId;
    }
    
    /**
     * @dev Accorde des droits d'accès à un utilisateur pour un fichier
     */
    function grantAccess(
        uint256 userId, 
        uint256 fileId, 
        bool canRead, 
        bool canWrite,
        uint256 readAccessHash,
        uint256 writeAccessHash
    ) external {
        uint256 grantorId = walletToUserId[msg.sender];
        require(grantorId != 0, "User not registered");
        require(users[userId].exists, "Target user does not exist");
        require(files[fileId].exists, "File does not exist");
        
        // Vérifier que le donneur d'accès a les droits d'écriture
        bytes32 grantorAccessKey = userFileAccessKey[grantorId][fileId];
        require(accessRights[grantorAccessKey].exists && accessRights[grantorAccessKey].canWrite, 
                "No write permission");
        
        _grantAccess(userId, fileId, canRead, canWrite, readAccessHash, writeAccessHash);
    }
    
    /**
     * @dev Fonction interne pour accorder des droits d'accès
     */
    function _grantAccess(
        uint256 userId, 
        uint256 fileId, 
        bool canRead, 
        bool canWrite,
        uint256 readAccessHash,
        uint256 writeAccessHash
    ) internal {
        bytes32 accessKey = keccak256(abi.encodePacked(userId, fileId));
        
        accessRights[accessKey] = AccessRight({
            userId: userId,
            fileId: fileId,
            canRead: canRead,
            canWrite: canWrite,
            readAccessHash: readAccessHash,
            writeAccessHash: writeAccessHash,
            exists: true
        });
        
        userFileAccessKey[userId][fileId] = accessKey;
        
        emit AccessRightGranted(userId, fileId, canRead, canWrite);
    }
    
    /**
     * @dev Accède à un fichier en utilisant une preuve ZKP
     * @param fileId L'ID du fichier
     * @param isWrite True pour accès en écriture, False pour lecture
     * @param a Premier élément de la preuve
     * @param b Deuxième élément de la preuve
     * @param c Troisième élément de la preuve
     * @param input Entrées publiques de la preuve
     * @return Le hash IPFS du fichier
     */
    function accessFileWithZKP(
        uint256 fileId,
        bool isWrite,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external returns (string memory) {
        require(files[fileId].exists, "File does not exist");
        
        // Déterminer quel hash utiliser en fonction du type d'accès
        uint256 expectedHash;
        
        if (isWrite) {
            // Trouver l'accessRight qui a ce writeAccessHash
            bool found = false;
            bytes32 accessKey;
            
            for (uint i = 1; i <= _userIdCounter.current(); i++) {
                accessKey = userFileAccessKey[i][fileId];
                if (accessRights[accessKey].exists && 
                    accessRights[accessKey].writeAccessHash == input[0]) {
                    found = true;
                    break;
                }
            }
            
            require(found, "No matching write access hash found");
            require(accessRights[accessKey].canWrite, "No write permission for this hash");
            expectedHash = accessRights[accessKey].writeAccessHash;
        } else {
            // Même processus pour la lecture
            bool found = false;
            bytes32 accessKey;
            
            for (uint i = 1; i <= _userIdCounter.current(); i++) {
                accessKey = userFileAccessKey[i][fileId];
                if (accessRights[accessKey].exists && 
                    accessRights[accessKey].readAccessHash == input[0]) {
                    found = true;
                    break;
                }
            }
            
            require(found, "No matching read access hash found");
            require(accessRights[accessKey].canRead, "No read permission for this hash");
            expectedHash = accessRights[accessKey].readAccessHash;
        }
        
        // Vérifier que le hash public fourni correspond à celui attendu
        require(input[0] == expectedHash, "Access hash mismatch");
        
        // Vérifier la preuve ZKP
        require(verifier.verifyProof(a, b, c, input), "ZKP verification failed");
        
        // Émettre l'événement (sans révéler l'utilisateur)
        emit FileAccessed(fileId, 0, isWrite); // userId à 0 car anonyme
        
        return files[fileId].ipfsHash;
    }
    
    // Les autres fonctions existantes resteraient disponibles pour la rétrocompatibilité
    // ...
}
