// test/config-test.js
const { expect } = require("chai");

describe("Configuration test", function() {
  it("Hardhat, Ethers et Chai sont correctement configurés", async function() {
    // Cette ligne vérifie que nous pouvons accéder à ethers
    const [owner] = await ethers.getSigners();
    
    // Cette ligne vérifie que nous pouvons obtenir une adresse
    expect(await owner.getAddress()).to.be.a('string');
    
    // Ce test vérifie que Chai fonctionne correctement
    expect(1).to.equal(1);
    
    console.log("Configuration testée avec succès!");
  });
});
