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
}

function parseArgs() {
  const args = process.argv.slice(2)
  let vault: string | undefined
  let json = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--vault' && i + 1 < args.length) {
      vault = args[i + 1].toLowerCase()
      i++
    } else if (a === '--json') {
      json = true
    }
  }
  return { vault, json }
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

async function main() {
  const { vault: vaultFilter, json } = parseArgs()
  let vaults = await sdk.listVaults()
  if (vaultFilter) {
    vaults = vaults.filter(v => v.address.toLowerCase() === vaultFilter)
    if (vaults.length === 0) {
      console.error(`Vault ${vaultFilter} not found`)
      process.exit(1)
    }
  }

  const prices = loadSharePrices()
  const now = Math.floor(Date.now() / 1000)
  const allAlerts: any[] = []

  for (const v of vaults) {
    const composition = await sdk.getComposition(v.address, HOLDINGS!)
    const queue = await sdk.getRedemptionQueue(v.address)
    const ids = await sdk.getIdentifiers(v.address)
    const price = prices.get(`${ids.poolId}-${ids.scId}`)

    const alerts: string[] = []
    for (const c of composition) {
      const drift = c.actualBps - c.targetBps
      if (Math.abs(drift) > 100) {
        const pct = (Math.abs(drift) / 100).toFixed(2)
        const dir = drift > 0 ? 'over' : 'under'
        alerts.push(`Drift on ${v.name}: ${c.asset} is ${pct}% ${dir} target`)
      }
    }
    if (queue.queueSize > 5) {
      alerts.push(`Redemption queue on ${v.name}: ${queue.queueSize} requests`)
    }
    if (!price || now - price.timestamp > 48 * 3600) {
      const hrs = price ? Math.floor((now - price.timestamp) / 3600) : 'unknown'
      alerts.push(`Share price stale on ${v.name}: Last update was ${hrs} hours ago`)
    }

    if (alerts.length > 0) {
      if (json) {
        allAlerts.push({ vault: v.name, address: v.address, alerts })
      } else {
        for (const a of alerts) console.log(`[ALERT] ${a}`)
      }
    }
  }

  if (json) {
    console.log(JSON.stringify(allAlerts, null, 2))
  }

  if (allAlerts.length > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

