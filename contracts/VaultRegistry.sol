// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {Auth} from "../src/misc/Auth.sol";

/// @title  Vault Registry
/// @notice Tracks deployed vaults and their metadata.
contract VaultRegistry is Auth {
    struct Metadata {
        string name;
        string description;
        string metadataURI;
        string vaultType;
        address creator;
        address factory;
        uint64 timestamp;
    }

    /// @notice Emitted when a vault is registered.
    event VaultRegistered(address indexed vault, address indexed factory, address indexed creator, string vaultType);

    /// @dev List of all registered vaults.
    address[] public vaults;

    /// @dev Metadata stored for each vault.
    mapping(address => Metadata) internal _metadata;

    constructor(address deployer) Auth(deployer) {}

    /// @notice Register a new vault and store its metadata.
    function registerVault(
        address vault,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        string calldata vaultType,
        address creator,
        address factory
    ) external auth {
        require(_metadata[vault].timestamp == 0, "already registered");

        _metadata[vault] = Metadata({
            name: name,
            description: description,
            metadataURI: metadataURI,
            vaultType: vaultType,
            creator: creator,
            factory: factory,
            timestamp: uint64(block.timestamp)
        });

        vaults.push(vault);
        emit VaultRegistered(vault, factory, creator, vaultType);
    }

    /// @notice Returns the list of all registered vault addresses.
    function getVaults() external view returns (address[] memory) {
        return vaults;
    }

    /// @notice Returns the metadata for a vault.
    function getMetadata(address vault) external view returns (Metadata memory) {
        return _metadata[vault];
    }
}
