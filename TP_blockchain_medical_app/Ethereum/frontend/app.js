const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_CHAIN_ID = "0x7a69"; // 31337 en hexadécimal
let contractABI, provider, signer, contract;

const statusEl = document.getElementById("status");
const log = (msg) => (statusEl.innerText = msg);

async function loadABI() {
  const response = await fetch("MedicalRecord.json");
  const artifact = await response.json();
  contractABI = artifact.abi;
}

document.getElementById("connectBtn").onclick = async () => {
  if (!window.ethereum) {
    alert("MetaMask non détecté. Installez l'extension.");
    return;
  }
  try {
    await loadABI();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    } catch (switchError) {
      console.warn("Impossible de switcher automatiquement :", switchError);
    }

    signer = await provider.getSigner();
    document.getElementById("account").innerText = await signer.getAddress();

    const network = await provider.getNetwork();
    document.getElementById("network").innerText =
      `${network.name} (chainId: ${network.chainId})`;

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    log("Connecté et contrat prêt.");
  } catch (err) {
    console.error(err);
    log("Erreur de connexion : " + err.message);
  }
};

if (window.ethereum) {
  window.ethereum.on("chainChanged", () => window.location.reload());
  window.ethereum.on("accountsChanged", () => window.location.reload());
}

// Calcule un hash keccak256 (bytes32) à partir d'un texte libre
document.getElementById("computeHashBtn").onclick = () => {
  const content = document.getElementById("recordContent").value;
  if (!content) {
    alert("Entrez un contenu de dossier à hasher.");
    return;
  }
  const hash = ethers.keccak256(ethers.toUtf8Bytes(content));
  document.getElementById("hashInput").value = hash;
};

// 5. Enregistrer un hash (transaction)
document.getElementById("registerBtn").onclick = async () => {
  const patientId = document.getElementById("patientId").value;
  const hash = document.getElementById("hashInput").value;
  if (!contract) return log("Connectez-vous d'abord à MetaMask.");
  try {
    log("Transaction en cours, confirmez dans MetaMask...");
    const tx = await contract.registerRecord(patientId, hash);
    await tx.wait();
    log("✅ Hash enregistré. Tx : " + tx.hash);
  } catch (err) {
    console.error(err);
    log("Erreur : " + (err.reason || err.message));
  }
};

// 6. Lire le dernier hash
document.getElementById("readBtn").onclick = async () => {
  const patientId = document.getElementById("patientIdRead").value;
  if (!contract) return log("Connectez-vous d'abord à MetaMask.");
  try {
    const hash = await contract.getLastHash(patientId);
    document.getElementById("lastHash").innerText = hash;
  } catch (err) {
    console.error(err);
    document.getElementById("lastHash").innerText = "Aucun dossier trouvé";
  }
};

// 7. Vérifier l'intégrité
document.getElementById("verifyBtn").onclick = async () => {
  const patientId = document.getElementById("patientIdVerify").value;
  const hash = document.getElementById("hashVerify").value;
  if (!contract) return log("Connectez-vous d'abord à MetaMask.");
  try {
    const isValid = await contract.verifyRecord(patientId, hash);
    document.getElementById("verifyResult").innerText = isValid ? "✅ Intègre" : "❌ Modifié";
  } catch (err) {
    console.error(err);
    document.getElementById("verifyResult").innerText = "Erreur : " + (err.reason || err.message);
  }
};