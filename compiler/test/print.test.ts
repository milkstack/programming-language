import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as path from 'path'
import { testOutputDir, compileAndRun } from './util/runner'

describe('Print Function Tests', () => {
  const fileName = 'print'

  afterEach(() => {
    const irFilePath = path.join(testOutputDir, `${fileName}.ll`)
    const binaryFilePath = path.join(testOutputDir, fileName)

    if (fs.existsSync(irFilePath)) {
      fs.unlinkSync(irFilePath)
    }
    if (fs.existsSync(binaryFilePath)) {
      fs.unlinkSync(binaryFilePath)
    }
  })

  it('should print to stdout correctly', async () => {
    const { returnVal, stdout, irPath } = await compileAndRun(fileName)

    const ir = await fsPromises.readFile(irPath, 'utf-8')
    expect(ir).toMatchSnapshot()

    expect(returnVal).toBe(0)
    expect(stdout).toBe('42\n')
  })
})
