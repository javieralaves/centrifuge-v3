// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {Auth} from "../../src/misc/Auth.sol";
import {PoolId} from "../../src/common/types/PoolId.sol";
import {ShareClassId} from "../../src/common/types/ShareClassId.sol";
import {AssetId} from "../../src/common/types/AssetId.sol";
import {IShareToken} from "../../src/spoke/interfaces/IShareToken.sol";
import {IAsyncRequestManager} from "../../src/vaults/interfaces/IVaultManagers.sol";
import {IHoldings} from "../../src/hub/interfaces/IHoldings.sol";

import {ComposableVault} from "./ComposableVault.sol";

/// @title  ComposableVaultFactory
/// @notice Deploys new ComposableVault contracts.
contract ComposableVaultFactory is Auth {
    /// @notice All vaults deployed by this factory.
    address[] public vaults;

    /// @notice Emitted when a new vault is deployed.
    event VaultCreated(address indexed vault);

    constructor(address deployer) Auth(deployer) {}

    /// @notice Deploy a new ComposableVault instance.
    /// @param poolId Pool identifier.
    /// @param scId Share class identifier.
    /// @param asset Underlying asset for deposits.
    /// @param token Share token to issue.
    /// @param root Address of the Root contract.
    /// @param manager Async request manager used by the vault.
    /// @param holdings Holdings contract for value checks.
    /// @param assetIds Asset identifiers tracked by the vault.
    /// @param assets ERC20 asset addresses tracked by the vault.
    /// @param targetWeightsBps Target weights for each asset in basis points.
    /// @param wards_ Additional authorized addresses for the vault.
    function newVault(
        PoolId poolId,
        ShareClassId scId,
        address asset,
        IShareToken token,
        address root,
        IAsyncRequestManager manager,
        IHoldings holdings,
        AssetId[] calldata assetIds,
        address[] calldata assets,
        uint16[] calldata targetWeightsBps,
        address[] calldata wards_
    ) external auth returns (ComposableVault vault) {
        vault =
            new ComposableVault(poolId, scId, asset, token, root, manager, holdings, assetIds, assets, targetWeightsBps);

        vault.rely(root);
        vault.rely(address(manager));
        uint256 len = wards_.length;
        for (uint256 i; i < len; i++) {
            vault.rely(wards_[i]);
        }
        vault.deny(address(this));

        vaults.push(address(vault));
        emit VaultCreated(address(vault));
    }

    /// @notice Number of vaults deployed.
    function vaultsLength() external view returns (uint256) {
        return vaults.length;
    }
}
