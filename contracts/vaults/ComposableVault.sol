// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {AsyncVault} from "../../src/vaults/AsyncVault.sol";
import {IHoldings} from "../../src/hub/interfaces/IHoldings.sol";
import {PoolId} from "../../src/common/types/PoolId.sol";
import {ShareClassId} from "../../src/common/types/ShareClassId.sol";
import {AssetId} from "../../src/common/types/AssetId.sol";
import {IShareToken} from "../../src/spoke/interfaces/IShareToken.sol";
import {IAsyncRequestManager} from "../../src/vaults/interfaces/IVaultManagers.sol";

/// @title  ComposableVault
/// @notice Vault extension supporting multiple assets with weight tracking.
contract ComposableVault is AsyncVault {
    /// @notice Information for a tracked asset.
    struct AssetConfig {
        AssetId assetId; // Hub identifier for the asset
        address asset; // ERC20 token address
        uint16 targetWeightBps; // Desired weight in basis points
    }

    /// @dev Basis points denominator.
    uint16 public constant BPS = 10_000;

    /// @notice Holdings contract to query real-time asset values.
    IHoldings public immutable holdings;

    /// @notice Registered assets.
    AssetConfig[] public assetConfigs;

    /// @notice Emitted when an asset weight drifts from its target.
    event DriftExceeded(address indexed asset, uint16 targetWeightBps, uint16 actualWeightBps);

    constructor(
        PoolId poolId_,
        ShareClassId scId_,
        address asset_,
        IShareToken token_,
        address root_,
        IAsyncRequestManager manager_,
        IHoldings holdings_,
        AssetId[] memory assetIds_,
        address[] memory assets_,
        uint16[] memory targetWeightsBps_
    ) AsyncVault(poolId_, scId_, asset_, token_, root_, manager_) {
        require(
            assetIds_.length == assets_.length && assets_.length == targetWeightsBps_.length,
            "length mismatch"
        );
        holdings = holdings_;
        for (uint256 i; i < assets_.length; i++) {
            assetConfigs.push(
                AssetConfig({assetId: assetIds_[i], asset: assets_[i], targetWeightBps: targetWeightsBps_[i]})
            );
        }
    }

    /// @notice Number of registered assets.
    function assetsLength() external view returns (uint256) {
        return assetConfigs.length;
    }

    /// @notice Checks asset weights and emits events if drift exceeds threshold.
    /// @param thresholdBps Allowed difference in basis points from the target.
    function checkDrift(uint16 thresholdBps) external {
        uint256 len = assetConfigs.length;
        if (len == 0) return;

        uint128[] memory values = new uint128[](len);
        uint256 totalValue;

        for (uint256 i; i < len; i++) {
            AssetConfig memory cfg = assetConfigs[i];
            uint128 value = holdings.value(poolId, scId, cfg.assetId);
            values[i] = value;
            totalValue += value;
        }

        if (totalValue == 0) return;

        for (uint256 i; i < len; i++) {
            AssetConfig memory cfg = assetConfigs[i];
            uint16 actual = uint16((uint256(values[i]) * BPS) / totalValue);
            uint16 target = cfg.targetWeightBps;
            uint16 diff = actual > target ? actual - target : target - actual;
            if (diff > thresholdBps) {
                emit DriftExceeded(cfg.asset, target, actual);
            }
        }
    }
}

