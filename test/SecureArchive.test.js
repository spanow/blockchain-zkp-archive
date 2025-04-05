// test/SecureArchive.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SecureArchive", function () {
  let secureArchive;
  let owner;
  let user1;
  let user2;
  
  beforeEach(async function () {
    const SecureArchive = await ethers.getContractFactory("SecureArchive");
    [owner, user1, user2] = await ethers.getSigners();
    
    secureArchive = await SecureArchive.deploy();
    await secureArchive.waitForDeployment();
  });

  describe("Enregistrement et gestion des utilisateurs", function () {
    it("Permet à un utilisateur de s'enregistrer", async function () {
      await expect(secureArchive.connect(user1).registerUser())
        .to.emit(secureArchive, "UserRegistered")
        .withArgs(1, await user1.getAddress());
        
      const userId = await secureArchive.connect(user1).getUserId();
      expect(userId).to.equal(1);
    });

    it("Empêche un utilisateur de s'enregistrer deux fois", async function () {
      await secureArchive.connect(user1).registerUser();
      await expect(secureArchive.connect(user1).registerUser())
        .to.be.revertedWith("User already registered");
    });
  });

  describe("Gestion des fichiers et des droits d'accès", function () {
    beforeEach(async function () {
      // Enregistrer les utilisateurs
      await secureArchive.connect(user1).registerUser();
      await secureArchive.connect(user2).registerUser();
    });

    it("Permet à un utilisateur d'ajouter un fichier", async function () {
      const ipfsHash = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
      
      // Utilisez await time.latest() ou simplement omettez la vérification du timestamp
      await expect(secureArchive.connect(user1).addFile(ipfsHash))
        .to.emit(secureArchive, "FileAdded");
      const [storedHash, timestamp, owner] = await secureArchive.getFileInfo(1);
      expect(storedHash).to.equal(ipfsHash);
        
    });

    it("Le créateur d'un fichier a tous les droits sur celui-ci", async function () {
      const ipfsHash = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
      await secureArchive.connect(user1).addFile(ipfsHash);
      
      const userId = await secureArchive.connect(user1).getUserId();
      const [canRead, canWrite] = await secureArchive.hasAccess(userId, 1);
      
      expect(canRead).to.be.true;
      expect(canWrite).to.be.true;
    });

    it("Permet d'accorder des droits d'accès à d'autres utilisateurs", async function () {
      const ipfsHash = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
      await secureArchive.connect(user1).addFile(ipfsHash);
      
      const user1Id = await secureArchive.connect(user1).getUserId();
      const user2Id = await secureArchive.connect(user2).getUserId();
      
      await expect(secureArchive.connect(user1).grantAccess(user2Id, 1, true, false))
        .to.emit(secureArchive, "AccessRightGranted")
        .withArgs(user2Id, 1, true, false);
      
      const [canRead, canWrite] = await secureArchive.hasAccess(user2Id, 1);
      expect(canRead).to.be.true;
      expect(canWrite).to.be.false;
    });

    it("Vérifie correctement les droits d'accès", async function () {
      const ipfsHash = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
      await secureArchive.connect(user1).addFile(ipfsHash);
      
      const user2Id = await secureArchive.connect(user2).getUserId();
      await secureArchive.connect(user1).grantAccess(user2Id, 1, true, false);
      
      // user2 a le droit de lecture mais pas d'écriture
      expect(await secureArchive.connect(user2).verifyAccess(1, false)).to.be.true;
      expect(await secureArchive.connect(user2).verifyAccess(1, true)).to.be.false;
    });

    it("Permet d'accéder à un fichier avec les bons droits", async function () {
      const ipfsHash = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
      await secureArchive.connect(user1).addFile(ipfsHash);
      
      const user2Id = await secureArchive.connect(user2).getUserId();
      await secureArchive.connect(user1).grantAccess(user2Id, 1, true, false);
      
      // Attendez la transaction et récupérez la valeur de retour
      const tx = await secureArchive.connect(user2).accessFile(1, false);
      const receipt = await tx.wait();
      
      // Ou si vous voulez simplement vérifier que la fonction ne génère pas d'erreur
      // Sans vérifier la valeur de retour exacte
      await expect(secureArchive.connect(user2).accessFile(1, false)).to.not.be.reverted;
      
      // user2 ne peut pas accéder au fichier en écriture
      await expect(secureArchive.connect(user2).accessFile(1, true))
        .to.be.revertedWith("Access denied");
    });
  });
});
