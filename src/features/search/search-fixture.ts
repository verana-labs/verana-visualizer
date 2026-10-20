import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

export const testnetModel = () =>
  buildNetworkModel({
    ecosystems: fixture('ecosystems'),
    schemas: fixture('schemas'),
    participants: fixture('participants'),
    corporations: fixture('corporations'),
    dids: fixture<{ dids: string[] }>('dids').dids,
  } satisfies RawNetwork)
