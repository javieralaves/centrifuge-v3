This repository contains the Centrifuge v3 protocol implementation.

Folder overview:
- `src` - main protocol contracts and libraries.
- `contracts` - additional extension contracts used for examples or integrations.
- `contracts/vaults/ComposableVaultFactory.sol` - deployer for creating `ComposableVault` instances.
- `contracts/VaultRegistry.sol` - registry storing vault metadata for UIs and indexers.
- `docs` - documentation files including architecture diagrams and audit reports.
- `env` - helper scripts and environment configuration for tests.
- `lib` - external libraries installed via Forge.
- `scripts` - offchain monitoring and indexer scripts (see `scripts/README.md`).
  - `SharePriceIndexer.ts` builds share price history in `logs/share_price.csv`.
- `snapshots` - test snapshots used by Forge.
- `test` - all unit, integration and fuzz tests for the protocol.
- `vault-sdk` - TypeScript SDK for querying vault metadata, vault composition, drift metrics and redemption queues.
  - Redemption queue logic is implemented in `vault-sdk/src/VaultSDK.ts`.

Root files:
- `foundry.toml` - Forge configuration.
- `remappings.txt` - dependency remappings for the build system.
- `slither.config.json` - configuration for Slither static analysis.
- `LICENSE` - license information.
- `README.md` - project documentation.
- `.env.example` - sample configuration for offchain scripts.
- `vault_report.ts` - CLI tool printing vault health reports using the Vault SDK and logs.
- `alert_vaults.ts` - CLI tool emitting vault health alerts only. Run `ts-node alert_vaults.ts [--vault <address>] [--json]` to check vaults and exit with code 1 on any warning.
