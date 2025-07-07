# Offchain Scripts

This folder contains offchain monitoring and indexing scripts.

## VaultDriftIndexer

`VaultDriftIndexer.ts` listens for `DriftExceeded` events emitted by `ComposableVault` contracts.
It appends each occurrence to `logs/drift.csv` so vault drift can be visualized and alerts generated.

### Usage

1. Copy `.env.example` to `.env` and set `RPC_URL` to a reachable Ethereum RPC node.
2. Add the vault addresses you want to monitor in `VaultDriftIndexer.ts`.
3. Run with `npx ts-node scripts/VaultDriftIndexer.ts`.

The CSV file columns are: `timestamp,vault,asset,targetBps,actualBps,driftBps`.
