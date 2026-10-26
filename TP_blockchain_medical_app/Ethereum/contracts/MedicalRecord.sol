// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MedicalRecord
/// @notice Enregistre l'empreinte cryptographique (hash) de dossiers medicaux
///         afin d'en garantir l'integrite, sans stocker les donnees medicales
///         elles-memes sur la blockchain.
contract MedicalRecord {

    struct RecordVersion {
        bytes32 hash;
        uint256 timestamp;
    }

    // patientId => liste des versions enregistrees (historique complet)
    mapping(string => RecordVersion[]) private records;

    event RecordRegistered(
        string patientId,
        bytes32 hash,
        uint256 timestamp,
        uint256 version
    );

    /// @notice Enregistre une nouvelle empreinte pour un patient donne
    function registerRecord(string memory patientId, bytes32 hash) public {
        records[patientId].push(RecordVersion(hash, block.timestamp));
        emit RecordRegistered(
            patientId,
            hash,
            block.timestamp,
            records[patientId].length
        );
    }

    /// @notice Retourne le dernier hash enregistre pour un patient
    function getLastHash(string memory patientId) public view returns (bytes32) {
        uint256 count = records[patientId].length;
        require(count > 0, "Aucun dossier enregistre pour ce patient");
        return records[patientId][count - 1].hash;
    }

    /// @notice Retourne la date d'enregistrement du dernier hash
    function getLastTimestamp(string memory patientId) public view returns (uint256) {
        uint256 count = records[patientId].length;
        require(count > 0, "Aucun dossier enregistre pour ce patient");
        return records[patientId][count - 1].timestamp;
    }

    /// @notice Verifie si un hash correspond au dernier hash enregistre
    function verifyRecord(string memory patientId, bytes32 hashToCheck) public view returns (bool) {
        bytes32 lastHash = getLastHash(patientId);
        return lastHash == hashToCheck;
    }

    /// @notice Retourne le nombre de versions enregistrees pour un patient
    function getVersionCount(string memory patientId) public view returns (uint256) {
        return records[patientId].length;
    }

    /// @notice Retourne une version specifique (hash + timestamp) par son index
    function getVersion(string memory patientId, uint256 index)
        public
        view
        returns (bytes32 hash, uint256 timestamp)
    {
        require(index < records[patientId].length, "Index invalide");
        RecordVersion memory v = records[patientId][index];
        return (v.hash, v.timestamp);
    }
}
