import * as fs from 'fs'
import { testOutputDir } from './util/runner'

export default async function globalTeardown() {
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true })
  }
}

