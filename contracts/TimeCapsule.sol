// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TimeCapsule {
    struct Capsule {
        address creator;
        uint256 unlockTimestamp;
        string ipfsCID;
        bool isUnlocked;
        uint256 createdAt;
    }

    uint256 public capsuleCounter;
    mapping(uint256 => Capsule) public capsules;

    event CapsuleCreated(uint256 id, address creator, uint256 unlockTimestamp, string ipfsCID);
    event CapsuleUnlocked(uint256 id);

    function createCapsule(uint256 _unlockTimestamp, string memory _ipfsCID) external {
        require(_unlockTimestamp > block.timestamp, "Unlock date must be in the future");
        capsuleCounter++;
        capsules[capsuleCounter] = Capsule({
            creator: msg.sender,
            unlockTimestamp: _unlockTimestamp,
            ipfsCID: _ipfsCID,
            isUnlocked: false,
            createdAt: block.timestamp
        });
        emit CapsuleCreated(capsuleCounter, msg.sender, _unlockTimestamp, _ipfsCID);
    }

    function unlockCapsule(uint256 _id) external {
        Capsule storage c = capsules[_id];
        require(c.creator != address(0), "Capsule does not exist");
        require(block.timestamp >= c.unlockTimestamp, "Time lock not expired");
        require(!c.isUnlocked, "Already unlocked");
        c.isUnlocked = true;
        emit CapsuleUnlocked(_id);
    }

    function getCapsule(uint256 _id) external view returns (address, uint256, string memory, bool, uint256) {
        Capsule memory c = capsules[_id];
        return (c.creator, c.unlockTimestamp, c.ipfsCID, c.isUnlocked, c.createdAt);
    }
}