import { network } from "hardhat";

const { ethers } = await network.connect();

const medicalRecord = await ethers.deployContract("MedicalRecord");
await medicalRecord.waitForDeployment();

console.log("MedicalRecord déployé à l'adresse :", await medicalRecord.getAddress());