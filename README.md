# 🏥 Medical Records Blockchain Integrity

Application web de gestion de dossiers médicaux intégrant la blockchain **Ethereum** afin de garantir l'**intégrité** des dossiers patients.

> Projet réalisé dans le cadre du module **Blockchain Industriel** : GI3, A.U. 2026/2027.

## 📌 Principe

Les données médicales sont sensibles : elles **ne sont jamais stockées sur la blockchain**. Elles restent dans la base de données de l'application (**off-chain**).

La blockchain conserve uniquement l'**empreinte cryptographique (hash)** du dossier (**on-chain**). Lors d'une vérification, le hash du dossier actuel est recalculé puis comparé à celui enregistré sur la blockchain :

- ✅ **Intégrité vérifiée** : le dossier n'a pas été modifié
- ❌ **Intégrité compromise** : le dossier a été altéré depuis son dernier enregistrement

```
Dossier médical → JSON → Hash (bytes32) → Smart Contract → Blockchain Ethereum
```

## ✨ Fonctionnalités

### Application médicale
- Authentification JWT (médecin / patient)
- Médecin : consulter ses patients, ajouter consultations, diagnostics et prescriptions
- Patient : consulter son profil, ses consultations, ses prescriptions et son dossier

### Intégration blockchain
- Connexion à **MetaMask** (adresse, réseau, Chain ID)
- Détection : MetaMask absent, connexion refusée, mauvais réseau
- Calcul du hash du dossier côté navigateur
- Enregistrement du hash sur la blockchain (versioning)
- Consultation du dernier hash et du nombre de versions
- Vérification de l'intégrité du dossier
- Détection de toute modification après enregistrement

## 🛠️ Technologies

| Domaine | Outils |
|---|---|
| Backend | Node.js, Express, JWT |
| Base de données | SQLite / base de l'application |
| Frontend | HTML, CSS, JavaScript |
| Blockchain | Solidity, Hardhat |
| Interaction | ethers.js, MetaMask |
| Réseau | Hardhat Local (Chain ID `31337`) |

## 📁 Structure du projet

```
.
├── Ethereum/              # Partie blockchain (Hardhat)
│   ├── contracts/         # MedicalRecord.sol
│   ├── scripts/           # Script de déploiement
│   ├── test/              # Tests du smart contract
│   └── hardhat.config.js
├── public/                # Interface web
├── server.js              # Serveur de l'application
├── .env.example
└── README.md
```

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/<ton-username>/medical-records-blockchain-integrity.git
cd medical-records-blockchain-integrity
```

### 2. Installer les dépendances
```bash
npm install
cd Ethereum && npm install && cd ..
```

### 3. Configuration
Créer un fichier `.env` à la racine :
```env
PORT=3000
JWT_SECRET=ma-cle-secrete
JWT_EXPIRES_IN=8h
```

### 4. Lancer le réseau Ethereum local
```bash
cd Ethereum
npx hardhat node
```

### 5. Compiler, tester et déployer le smart contract
```bash
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network localhost
```
Noter l'adresse du contrat déployé et la renseigner dans le code frontend.

### 6. Lancer l'application
```bash
npm start
```
Ouvrir : http://localhost:3000

### 7. Configurer MetaMask

| Paramètre | Valeur |
|---|---|
| Réseau | Hardhat Local |
| RPC | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Symbole | ETH |

Importer un compte de test fourni par `hardhat node`.

## 🧪 Scénario de test

1. **Premier enregistrement** : le dossier est enregistré, versions = 1
2. **Dossier inchangé** : vérification → *Intégrité vérifiée*
3. **Dossier modifié** (non enregistré) : vérification → *Intégrité compromise*
4. **Nouvel enregistrement** : versions = 2, vérification → *Intégrité vérifiée*

## 📜 Smart contract `MedicalRecord`

- Association patient → versions du dossier
- Enregistrement du hash et de la date
- Récupération du dernier hash
- Vérification d'intégrité
- Nombre de versions
- Émission d'un événement à chaque enregistrement

## ⚠️ Remarques

- Projet **pédagogique** : réseau local uniquement, ETH de test sans valeur.
- Ne jamais commiter le fichier `.env` ni de clés privées.

## 👤 Auteur

**<Ton nom>** : Étudiant GI3
Encadrante : Sirine LAMIN
