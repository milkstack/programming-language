import * as fs from 'fs'
import * as path from 'path'
import { compileAndRun, testOutputDir } from './util/runner'

const languageFilesDir = path.join(__dirname, 'language-files', 'happy-paths')

type ExpectedResultsMap = Record<string, number>

// ADD MAPPINGS FOR NEW TEST FILES HERE
export const expectedResultsMapping: ExpectedResultsMap = {
  assignment: 5,
  binaryExpression: 8,
  expression: 7,
  expressionStatement: 2,
  forLoop: 3,
  function: 6,
  ifStatement: 2,
  whileLoop: 11,
  nestedWhileLoops: 9,
  continue: 6,
  break: 6,
}

function getAllLanguageFiles(): string[] {
  const files = fs.readdirSync(languageFilesDir)
  return files
    .filter((file) => file.endsWith('.oli'))
    .map((file) => path.basename(file, '.oli'))
}

describe('Language Files Compilation', () => {
  const languageFiles = getAllLanguageFiles()

  afterEach(() => {
    languageFiles.forEach((fileName) => {
      const irFilePath = path.join(testOutputDir, `${fileName}.ll`)
      const binaryFilePath = path.join(testOutputDir, fileName)

      if (fs.existsSync(irFilePath)) {
        fs.unlinkSync(irFilePath)
      }
      if (fs.existsSync(binaryFilePath)) {
        fs.unlinkSync(binaryFilePath)
      }
    })
  })

  describe('IR Generation', () => {
    it.each(languageFiles)('should generate valid IR for %s', (fileName) => {
      const { irPath, returnVal } = compileAndRun(fileName, 'happy-paths')
      const ir = fs.readFileSync(irPath, 'utf-8')

      expect(ir).toMatchSnapshot()

      const expected = expectedResultsMapping[fileName]
      if (expected !== null && expected !== undefined) {
        expect(returnVal).toBe(expected)
      } else {
        throw new Error(
          `No expected results mapping found for "${fileName}". Please add an entry to expectedResultsMapping in happy-paths.test.ts for this file, including the expected return value.`
        )
      }
    })
  })
})
