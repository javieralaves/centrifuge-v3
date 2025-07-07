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

// Address of the Hub or Spoke contract emitting UpdateSharePrice
const HUB_ADDRESS = '0xHubAddress'

const SHARE_PRICE_ABI = [
  'event UpdateSharePrice(uint256 indexed poolId,uint256 indexed scId,uint256 price,uint64 computedAt)'
]

async function main() {
  const hub = new ethers.Contract(HUB_ADDRESS, SHARE_PRICE_ABI, provider)
  const filter = hub.filters.UpdateSharePrice()
  const events = await hub.queryFilter(filter, 0, 'latest')

  const csvPath = path.join(__dirname, '..', 'logs', 'share_price.csv')
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'timestamp,vault,price\n')
  }

  for (const ev of events) {
    const block = await provider.getBlock(ev.blockNumber)
    const vault = `${ev.args.poolId.toString()}-${ev.args.scId.toString()}`
    const line = `${block.timestamp},${vault},${ev.args.price.toString()}\n`
    fs.appendFileSync(csvPath, line)
    console.log(`Share price | vault: ${vault} price: ${ev.args.price.toString()} | ${new Date(block.timestamp * 1000).toISOString()}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
