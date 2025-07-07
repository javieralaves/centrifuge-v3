import { config as loadEnv } from 'dotenv'
import { ethers, BigNumber } from 'ethers'
import fs from 'fs'
import path from 'path'
import { VaultSDK } from './vault-sdk/src/VaultSDK'

loadEnv()

const RPC_URL = process.env.RPC_URL
const REGISTRY = process.env.VAULT_REGISTRY
const HOLDINGS = process.env.HOLDINGS

if (!RPC_URL || !REGISTRY || !HOLDINGS) {
  console.error('RPC_URL, VAULT_REGISTRY and HOLDINGS must be set in environment')
  process.exit(1)
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const sdk = new VaultSDK(provider, REGISTRY)

interface ShareInfo {
  timestamp: number
  price: string
}

function loadSharePrices(): Map<string, ShareInfo> {
  const csvPath = path.join(__dirname, 'logs', 'share_price.csv')
  const map = new Map<string, ShareInfo>()
  if (!fs.existsSync(csvPath)) return map
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n').slice(1)
  for (const line of lines) {
    const [tsStr, vault, price] = line.split(',')
    const ts = Number(tsStr)
    const prev = map.get(vault)
    if (!prev || ts > prev.timestamp) {
      map.set(vault, { timestamp: ts, price })
    }
  }
  return map
}

function escapeCsv(val: string): string {
  const cleaned = val.replace(/\n|\r/g, ' ')
  if (cleaned.includes(',') || cleaned.includes('"')) {
    return '"' + cleaned.replace(/"/g, '""') + '"'
  }
  return cleaned
}

async function main() {
  const vaults = await sdk.listVaults()
  const prices = loadSharePrices()
  const now = Math.floor(Date.now() / 1000)
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const csvPath = path.join(__dirname, 'logs', `metrics_${dateStr}.csv`)
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  const header = 'vault,address,sharePrice,tvl,pending,claimable,numAssets,maxDriftBps,sharePriceUpdated,warnings\n'
  fs.writeFileSync(csvPath, header)

  for (const v of vaults) {
    const composition = await sdk.getComposition(v.address, HOLDINGS!)
    const queue = await sdk.getRedemptionQueue(v.address)
    const ids = await sdk.getIdentifiers(v.address)
    const price = prices.get(`${ids.poolId}-${ids.scId}`)

    let tvl = BigNumber.from(0)
    let maxDrift = 0
    for (const c of composition) {
      tvl = tvl.add(BigNumber.from(c.value))
      const drift = Math.abs(c.actualBps - c.targetBps)
      if (drift > maxDrift) maxDrift = drift
    }

    const warnings: string[] = []
    if (maxDrift > 100) warnings.push('drift>100bps')
    if (queue.queueSize > 5) warnings.push('queue>5')
    if (!price || now - price.timestamp > 48 * 3600) warnings.push('share price stale')

    const sharePrice = price ? price.price : ''
    const updated = price ? new Date(price.timestamp * 1000).toISOString() : ''
    const line = [
      escapeCsv(v.name),
      v.address,
      sharePrice,
      tvl.toString(),
      queue.pendingAmount,
      queue.claimableAmount,
      composition.length.toString(),
      maxDrift.toString(),
      updated,
      escapeCsv(warnings.join(','))
    ].join(',') + '\n'
    fs.appendFileSync(csvPath, line)
  }

  console.log(`Metrics saved to ${csvPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

