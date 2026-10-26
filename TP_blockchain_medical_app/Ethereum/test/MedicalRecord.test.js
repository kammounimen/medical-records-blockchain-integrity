import { expect } from "chai";
import { network } from "hardhat";

describe("MedicalRecord", async function () {
  const { ethers } = await network.getOrCreate();

  function hashOf(content) {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }

  it("doit enregistrer un hash pour un patient", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-001";
    const hash = hashOf("dossier version 1");

    await medicalRecord.registerRecord(patientId, hash);

    expect(await medicalRecord.getVersionCount(patientId)).to.equal(1);
    expect(await medicalRecord.getLastHash(patientId)).to.equal(hash);
  });

  it("doit recuperer le dernier hash enregistre parmi plusieurs versions", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-002";
    const hash1 = hashOf("v1");
    const hash2 = hashOf("v2");

    await medicalRecord.registerRecord(patientId, hash1);
    await medicalRecord.registerRecord(patientId, hash2);

    expect(await medicalRecord.getLastHash(patientId)).to.equal(hash2);
  });

  it("doit verifier un hash correct", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-003";
    const hash = hashOf("dossier correct");

    await medicalRecord.registerRecord(patientId, hash);

    expect(await medicalRecord.verifyRecord(patientId, hash)).to.equal(true);
  });

  it("doit detecter un hash incorrect (dossier modifie)", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-004";
    const hashOriginal = hashOf("dossier original");
    const hashModifie = hashOf("dossier modifie");

    await medicalRecord.registerRecord(patientId, hashOriginal);

    expect(await medicalRecord.verifyRecord(patientId, hashModifie)).to.equal(false);
  });

  it("doit echouer (revert) pour un patient sans dossier", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");

    await expect(
      medicalRecord.getLastHash("PATIENT-INCONNU")
    ).to.be.revertedWith("Aucun dossier enregistre pour ce patient");
  });

  it("doit gerer plusieurs versions successives", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-005";

    await medicalRecord.registerRecord(patientId, hashOf("v1"));
    await medicalRecord.registerRecord(patientId, hashOf("v2"));
    await medicalRecord.registerRecord(patientId, hashOf("v3"));

    expect(await medicalRecord.getVersionCount(patientId)).to.equal(3);
  });

  it("doit emettre l'evenement RecordRegistered lors de l'enregistrement", async function () {
    const medicalRecord = await ethers.deployContract("MedicalRecord");
    const patientId = "PATIENT-006";
    const hash = hashOf("dossier evenement");

    await expect(medicalRecord.registerRecord(patientId, hash))
      .to.emit(medicalRecord, "RecordRegistered");
  });
});