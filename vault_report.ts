import { config as loadEnv } from 'dotenv'
import { ethers } from 'ethers'
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
  prevTimestamp?: number
  prevPrice?: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  let vault: string | undefined
  let format: 'table' | 'json' = 'table'
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--vault' && i + 1 < args.length) {
      vault = args[i + 1].toLowerCase()
      i++
    } else if (a === '--format' && i + 1 < args.length) {
      if (args[i + 1] === 'json') format = 'json'
      i++
    }
  }
  return { vault, format }
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
      map.set(vault, { timestamp: ts, price, prevTimestamp: prev?.timestamp, prevPrice: prev?.price })
    }
  }
  return map
}

async function buildReport() {
  const { vault: vaultFilter, format } = parseArgs()
  let vaults = await sdk.listVaults()
  if (vaultFilter) {
    vaults = vaults.filter(v => v.address.toLowerCase() === vaultFilter)
    if (vaults.length === 0) {
      console.error(`Vault ${vaultFilter} not found`)
      process.exit(1)
    }
  }

  const prices = loadSharePrices()
  const reports: any[] = []
  for (const v of vaults) {
    const composition = await sdk.getComposition(v.address, HOLDINGS!)
    const queue = await sdk.getRedemptionQueue(v.address)
    const ids = await sdk.getIdentifiers(v.address)
    const price = prices.get(`${ids.poolId}-${ids.scId}`)
    const now = Math.floor(Date.now() / 1000)
    const warnings: string[] = []
    const comp = composition.map(c => {
      const drift = c.actualBps - c.targetBps
      if (Math.abs(drift) > 100) warnings.push(`Drift >100bps on ${c.asset}`)
      return { ...c, drift }
    })
    if (queue.queueSize > 5) warnings.push(`Redemption queue size ${queue.queueSize}`)
    if (!price || now - price.timestamp > 48 * 3600) warnings.push('Share price stale')

    reports.push({
      address: v.address,
      name: v.name,
      sharePrice: price ? { price: price.price, timestamp: price.timestamp } : null,
      redemptionQueue: queue,
      composition: comp,
      warnings
    })
  }

  if (format === 'json') {
    console.log(JSON.stringify(reports, null, 2))
    return
  }

  for (const r of reports) {
    console.log(`Vault: ${r.name} (${r.address})`)
    if (r.sharePrice) {
      console.log(`  Share price: ${r.sharePrice.price} @ ${new Date(r.sharePrice.timestamp * 1000).toISOString()}`)
    } else {
      console.log('  Share price: n/a')
    }
    console.log(`  Redemption queue size: ${r.redemptionQueue.queueSize} (pending: ${r.redemptionQueue.pendingAmount}, claimable: ${r.redemptionQueue.claimableAmount})`)
    console.log('  Composition:')
    console.log('    Asset                          Target  Actual  Drift')
    for (const c of r.composition) {
      const driftStr = c.drift >= 0 ? '+' + c.drift : c.drift.toString()
      console.log(`    ${c.asset.padEnd(30)} ${String(c.targetBps).padStart(6)} ${String(c.actualBps).padStart(6)} ${driftStr.padStart(6)}`)
    }
    if (r.warnings.length > 0) {
      console.log('  Warnings:')
      for (const w of r.warnings) {
        console.log('   - ' + w)
      }
    }
    console.log('')
  }
}

buildReport().catch(err => {
  console.error(err)
  process.exit(1)
})

