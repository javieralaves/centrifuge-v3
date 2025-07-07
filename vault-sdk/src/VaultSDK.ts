import { VaultMetadata, VaultComposition } from './types'
import { getAllVaults, getVaultMetadata } from './registry'
import { fetchVaultComposition } from './composition'

export class VaultSDK {
  provider: any
  registry: string

  constructor(provider: any, registry: string) {
    this.provider = provider
    this.registry = registry
  }

  async listVaults(): Promise<VaultMetadata[]> {
    const vaults = await getAllVaults(this.provider, this.registry)
    const meta = await Promise.all(vaults.map(v => getVaultMetadata(this.provider, this.registry, v)))
    return meta
  }

  async getComposition(vaultAddr: string, holdingsAddr: string): Promise<VaultComposition[]> {
    return await fetchVaultComposition(this.provider, vaultAddr, holdingsAddr)
  }

  // More methods coming in future prompts...
}
