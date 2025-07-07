This repository contains the Centrifuge v3 protocol implementation.

Folder overview:
- `src` - main protocol contracts and libraries.
- `contracts` - additional extension contracts used for examples or integrations.
- `contracts/vaults/ComposableVaultFactory.sol` - deployer for creating `ComposableVault` instances.
- `docs` - documentation files including architecture diagrams and audit reports.
- `env` - helper scripts and environment configuration for tests.
- `lib` - external libraries installed via Forge.
- `scripts` - offchain monitoring and indexer scripts.
- `snapshots` - test snapshots used by Forge.
- `test` - all unit, integration and fuzz tests for the protocol.

Root files:
- `foundry.toml` - Forge configuration.
- `remappings.txt` - dependency remappings for the build system.
- `slither.config.json` - configuration for Slither static analysis.
- `LICENSE` - license information.
- `README.md` - project documentation.
- `.env.example` - sample configuration for offchain scripts.
