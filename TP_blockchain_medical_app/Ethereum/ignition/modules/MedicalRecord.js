import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MedicalRecordModule", (m) => {
  const medicalRecord = m.contract("MedicalRecord");

  return { medicalRecord };
});