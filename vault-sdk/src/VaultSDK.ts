import { VaultMetadata, VaultComposition, RedemptionQueue } from './types'
import { getAllVaults, getVaultMetadata } from './registry'
import { fetchVaultComposition } from './composition'
import { ethers, BigNumber } from 'ethers'

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

  async getRedemptionQueue(vaultAddr: string, user?: string): Promise<RedemptionQueue> {
    const VAULT_ABI = ['function asyncManager() view returns (address)']
    const MANAGER_ABI = [
      'function pendingRedeemRequest(address,address) view returns (uint256)',
      'function claimableCancelRedeemRequest(address,address) view returns (uint256)'
    ]
    const EVENT_ABI = [
      'event RedeemRequest(address indexed controller,address indexed owner,uint256 indexed requestId,address sender,uint256 shares)'
    ]

    const vault = new ethers.Contract(vaultAddr, VAULT_ABI, this.provider)
    const managerAddr: string = await vault.asyncManager()
    const manager = new ethers.Contract(managerAddr, MANAGER_ABI, this.provider)

    if (user) {
      const pending: BigNumber = await manager.pendingRedeemRequest(vaultAddr, user)
      const claimable: BigNumber = await manager.claimableCancelRedeemRequest(vaultAddr, user)
      const size = !pending.isZero() || !claimable.isZero() ? 1 : 0
      return { queueSize: size, pendingAmount: pending.toString(), claimableAmount: claimable.toString() }
    }

    const vaultEvents = new ethers.Contract(vaultAddr, EVENT_ABI, this.provider)
    const events = await vaultEvents.queryFilter(vaultEvents.filters.RedeemRequest(), 0, 'latest')
    const controllers = new Set<string>()
    events.forEach((ev: any) => {
      controllers.add(ev.args.controller.toLowerCase())
    })

    let pendingTotal = BigNumber.from(0)
    let claimableTotal = BigNumber.from(0)
    let count = 0
    for (const addr of controllers) {
      const pending: BigNumber = await manager.pendingRedeemRequest(vaultAddr, addr)
      const claimable: BigNumber = await manager.claimableCancelRedeemRequest(vaultAddr, addr)
      if (!pending.isZero() || !claimable.isZero()) {
        count++
        pendingTotal = pendingTotal.add(pending)
        claimableTotal = claimableTotal.add(claimable)
      }
    }

    return {
      queueSize: count,
      pendingAmount: pendingTotal.toString(),
      claimableAmount: claimableTotal.toString()
    }
  }

  // More methods coming in future prompts...
}
