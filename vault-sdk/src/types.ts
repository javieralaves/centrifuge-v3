export interface VaultMetadata {
  address: string
  name: string
  description: string
  metadataURI: string
  vaultType: string
  creator: string
  factory: string
  timestamp: number
}

export interface DriftEvent {
  timestamp: number
  vault: string
  asset: string
  targetBps: number
  actualBps: number
  driftBps: number
}

export interface VaultComposition {
  asset: string
  assetId: string
  value: string
  targetBps: number
  actualBps: number
}
