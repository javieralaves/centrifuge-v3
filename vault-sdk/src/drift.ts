import fs from 'fs'
import { DriftEvent } from './types'

export async function loadDriftCsv(path: string): Promise<DriftEvent[]> {
  const csv = fs.readFileSync(path, 'utf8')
  const lines = csv.trim().split('\n').slice(1)
  return lines.map((line) => {
    const [timestamp, vault, asset, targetBps, actualBps, driftBps] = line.split(',')
    return {
      timestamp: Number(timestamp),
      vault,
      asset,
      targetBps: Number(targetBps),
      actualBps: Number(actualBps),
      driftBps: Number(driftBps)
    }
  })
}
