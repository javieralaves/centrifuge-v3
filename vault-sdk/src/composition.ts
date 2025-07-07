import { ethers, BigNumber } from 'ethers'
import { VaultComposition } from './types'

const VAULT_ABI = [
  'function assetsLength() view returns (uint256)',
  'function assetConfigs(uint256) view returns (uint128 assetId,address asset,uint16 targetWeightBps)',
  'function poolId() view returns (uint256)',
  'function scId() view returns (uint256)'
]

const HOLDINGS_ABI = [
  'function value(uint256 poolId,uint256 scId,uint256 assetId) view returns (uint128)'
]

export async function fetchVaultComposition(provider: any, vaultAddr: string, holdingsAddr: string): Promise<VaultComposition[]> {
  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, provider)
  const holdings = new ethers.Contract(holdingsAddr, HOLDINGS_ABI, provider)

  const len: number = await vault.assetsLength()
  const poolId: BigNumber = await vault.poolId()
  const scId: BigNumber = await vault.scId()

  const configs = [] as VaultComposition[]
  const values: BigNumber[] = []

  for (let i = 0; i < len; i++) {
    const cfg = await vault.assetConfigs(i)
    const value: BigNumber = await holdings.value(poolId, scId, cfg.assetId)
    values.push(value)
    configs.push({
      asset: cfg.asset,
      assetId: cfg.assetId.toString(),
      value: value.toString(),
      targetBps: Number(cfg.targetWeightBps),
      actualBps: 0
    })
  }

  const total = values.reduce((acc, v) => acc.add(v), BigNumber.from(0))
  if (!total.isZero()) {
    configs.forEach((c, idx) => {
      c.actualBps = Number(values[idx].mul(10000).div(total))
    })
  }

  return configs
}
