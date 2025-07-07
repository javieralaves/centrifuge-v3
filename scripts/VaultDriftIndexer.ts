import { config as loadEnv } from 'dotenv'
import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'

loadEnv()

const RPC_URL = process.env.RPC_URL
if (!RPC_URL) {
  console.error('RPC_URL environment variable not set')
  process.exit(1)
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)

// Add the ComposableVault addresses to monitor
const vaultAddresses: string[] = [
  // '0xYourVaultAddress1',
  // '0xYourVaultAddress2',
]

const DRIFT_EXCEEDED_ABI = [
  'event DriftExceeded(address indexed asset, uint256 targetWeightBps, uint256 actualWeightBps)'
]

const csvPath = path.join(__dirname, '..', 'logs', 'drift.csv')
fs.mkdirSync(path.dirname(csvPath), { recursive: true })
if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, 'timestamp,vault,asset,targetBps,actualBps,driftBps\n')
}

function appendLine(line: string) {
  fs.appendFileSync(csvPath, line)
}

function start() {
  if (vaultAddresses.length === 0) {
    console.warn('No vault addresses configured to watch')
  }
  for (const addr of vaultAddresses) {
    const vault = new ethers.Contract(addr, DRIFT_EXCEEDED_ABI, provider)
    vault.on('DriftExceeded', async (asset: string, target: ethers.BigNumber, actual: ethers.BigNumber, event: ethers.Event) => {
      try {
        const block = await provider.getBlock(event.blockNumber)
        const timestamp = block.timestamp
        const drift = target.sub(actual).abs()
        const line = `${timestamp},${addr},${asset},${target.toString()},${actual.toString()},${drift.toString()}\n`
        appendLine(line)
        console.log(`DriftExceeded | vault: ${addr} asset: ${asset} target: ${target.toString()} actual: ${actual.toString()} drift: ${drift.toString()} | ${new Date(timestamp * 1000).toISOString()}`)
      } catch (err) {
        console.error('Failed to process event', err)
      }
    })
  }
  console.log('VaultDriftIndexer started. Watching DriftExceeded events...')
}

start()
