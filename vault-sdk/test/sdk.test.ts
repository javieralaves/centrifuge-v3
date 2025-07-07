import assert from 'assert'
import { VaultSDK } from '../src/VaultSDK'
async function run() {
  const sdk = new VaultSDK({} as any, '0xRegistry')
  assert.ok(sdk)
  console.log('tests passed')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
