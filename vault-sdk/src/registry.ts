import { ethers } from 'ethers'
import { VaultMetadata } from './types'

const ABI = [
  'function getVaults() view returns (address[])',
  'function getMetadata(address) view returns (tuple(string name,string description,string metadataURI,string vaultType,address creator,address factory,uint64 timestamp))'
]

export async function getAllVaults(provider: any, registry: string): Promise<string[]> {
  const contract = new ethers.Contract(registry, ABI, provider)
  return await contract.getVaults()
}

export async function getVaultMetadata(provider: any, registry: string, addr: string): Promise<VaultMetadata> {
  const contract = new ethers.Contract(registry, ABI, provider)
  const raw = await contract.getMetadata(addr)
  return {
    address: addr,
    name: raw.name,
    description: raw.description,
    metadataURI: raw.metadataURI,
    vaultType: raw.vaultType,
    creator: raw.creator,
    factory: raw.factory,
    timestamp: Number(raw.timestamp)
  }
}
