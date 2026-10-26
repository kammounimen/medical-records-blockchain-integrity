// public/doctor/js/blockchain.js

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const EXPECTED_CHAIN_ID = 31337;

// ABI du contrat MedicalRecord (forme lisible, équivalente au JSON généré par Hardhat)
const CONTRACT_ABI = [
  "function registerRecord(string patientId, bytes32 hash)",
  "function getLastHash(string patientId) view returns (bytes32)",
  "function getLastTimestamp(string patientId) view returns (uint256)",
  "function verifyRecord(string patientId, bytes32 hashToCheck) view returns (bool)",
  "function getVersionCount(string patientId) view returns (uint256)",
  "function getVersion(string patientId, uint256 index) view returns (bytes32 hash, uint256 timestamp)",
  "event RecordRegistered(string patientId, bytes32 hash, uint256 timestamp, uint256 version)"
];

let provider, signer, contract;

function setBcStatus(msg, isError = false) {
  const el = document.getElementById("bcStatus");
  el.textContent = msg;
  el.style.color = isError ? "#dc2626" : "#16a34a";
}

/* ===== Partie 2 : connexion à MetaMask ===== */
async function connectWallet() {
  // Cas 1 : MetaMask absent
  if (typeof window.ethereum === "undefined") {
    setBcStatus("MetaMask n'est pas disponible. Installez l'extension MetaMask.", true);
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []); // ouvre la fenêtre MetaMask
    signer = await provider.getSigner();

    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId); // chainId est un BigInt

    document.getElementById("account").textContent = address;
    document.getElementById("chainId").textContent = chainId;
    document.getElementById("networkName").textContent =
      chainId === EXPECTED_CHAIN_ID ? "Hardhat Local" : "Réseau inconnu (" + network.name + ")";

    // Cas 3 : mauvais réseau
    if (chainId !== EXPECTED_CHAIN_ID) {
      contract = null;
      setBcStatus(
        "Mauvais réseau (Chain ID " + chainId + "). Passez sur Hardhat Local (Chain ID 31337).",
        true
      );
      return;
    }

    // Partie 3 : connexion au contrat déjà déployé
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setBcStatus("MetaMask connecté au réseau Hardhat Local.");
    await refreshBlockchainState();
  } catch (err) {
    // Cas 2 : l'utilisateur refuse la connexion
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      setBcStatus("Connexion refusée par l'utilisateur.", true);
    } else {
      setBcStatus("Erreur : " + (err.shortMessage || err.message), true);
    }
  }
}

/* ===== Partie 3 : lire l'état blockchain du dossier ===== */
async function refreshBlockchainState() {
  const count = Number(await contract.getVersionCount(patientId));
  document.getElementById("versionCount").textContent = count;

  if (count === 0) {
    // getLastHash ferait un revert : on ne l'appelle pas
    document.getElementById("lastHash").textContent =
      "Aucune version enregistrée sur la blockchain";
    return;
  }
  document.getElementById("lastHash").textContent = await contract.getLastHash(patientId);
}

document.getElementById("btnConnect").addEventListener("click", connectWallet);

// Si le médecin change de compte ou de réseau dans MetaMask, on recharge la page
if (window.ethereum) {
  window.ethereum.on("chainChanged", () => window.location.reload());
  window.ethereum.on("accountsChanged", () => window.location.reload());
}

/* ===== Partie 4 : empreinte cryptographique du dossier ===== */

// Sérialisation JSON "canonique" : les clés sont triées, donc le même
// contenu donne toujours exactement le même texte (et le même hash).
function stableStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ":" + stableStringify(value[k]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

// On ne garde que les données médicales (liste blanche) : aucun champ
// technique ou sensible (mot de passe, token...) n'entre dans le hash.
function buildRecordForHash(dossier) {
  const p = dossier.patient || {};
  return {
    patient: {
      id: p.id,
      name: p.name,
      email: p.email,
      birth_date: p.birth_date,
      gender: p.gender,
      blood_type: p.blood_type,
    },
    consultations: (dossier.consultations || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((c) => ({
        id: c.id,
        date: c.date,
        reason: c.reason,
        notes: c.notes,
        diagnostics: (c.diagnostics || [])
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((d) => ({ id: d.id, description: d.description })),
        prescriptions: (c.prescriptions || [])
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((r) => ({
            id: r.id,
            medication: r.medication,
            dosage: r.dosage,
            duration: r.duration,
            instructions: r.instructions,
          })),
      })),
  };
}

// keccak256 renvoie "0x" + 64 caractères hexadécimaux = valeur bytes32
function computeRecordHash(dossier) {
  const json = stableStringify(buildRecordForHash(dossier));
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

// On recharge le dossier depuis le serveur à chaque fois pour être sûr
// de travailler sur la version la plus récente.
async function getFreshDossier() {
  return await apiFetch(`/api/doctor/patients/${patientId}/dossier`);
}

/* ===== Partie 5 : enregistrer le dossier sur la blockchain ===== */
async function saveRecordOnChain() {
  if (!contract) {
    setBcStatus("Connectez d'abord MetaMask (réseau Hardhat Local).", true);
    return;
  }
  try {
    const dossier = await getFreshDossier();              // 1. dossier courant
    const hash = computeRecordHash(dossier);              // 2. empreinte

    setBcStatus("Confirmez la transaction dans MetaMask...");
    const tx = await contract.registerRecord(patientId, hash); // 3 et 4

    setBcStatus("Transaction envoyée, attente de confirmation...");
    await tx.wait();                                      // 5. confirmation

    await refreshBlockchainState();                       // 6. actualisation
    document.getElementById("verifyResult").textContent = "";
    setBcStatus("Dossier enregistré avec succès sur la blockchain.");
  } catch (err) {
    if (err.code === "ACTION_REJECTED" || err.code === 4001) {
      setBcStatus("Transaction refusée dans MetaMask.", true);
    } else {
      setBcStatus("Erreur : " + (err.shortMessage || err.message), true);
    }
  }
}

/* ===== Partie 6 : vérifier l'intégrité du dossier ===== */
async function verifyIntegrity() {
  const result = document.getElementById("verifyResult");
  if (!contract) {
    setBcStatus("Connectez d'abord MetaMask (réseau Hardhat Local).", true);
    return;
  }
  try {
    const count = Number(await contract.getVersionCount(patientId));
    if (count === 0) {
      result.textContent = "Aucune version blockchain : enregistrez d'abord le dossier.";
      result.style.color = "#d97706";
      return;
    }

    const dossier = await getFreshDossier();
    const hash = computeRecordHash(dossier);
    const ok = await contract.verifyRecord(patientId, hash); // lecture, sans transaction

    if (ok) {
      result.textContent = "✅ Intégrité vérifiée";
      result.style.color = "#16a34a";
    } else {
      result.textContent = "❌ Intégrité compromise";
      result.style.color = "#dc2626";
    }
  } catch (err) {
    setBcStatus("Erreur : " + (err.shortMessage || err.message), true);
  }
}

document.getElementById("btnSave").addEventListener("click", saveRecordOnChain);
document.getElementById("btnVerify").addEventListener("click", verifyIntegrity);