import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
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
  singleLineComment: 5,
  multiLineComment: 10,
  mixedComments: 5,
}

function getAllLanguageFiles(): string[] {
  const files = fs.readdirSync(languageFilesDir)
  return files
    .filter((file: string) => file.endsWith('.oli'))
    .map((file: string) => path.basename(file, '.oli'))
}

describe('Language Files Compilation', () => {
  const languageFiles = getAllLanguageFiles()

  it.concurrent.each(languageFiles)(
    'should generate valid IR for %s',
    async (fileName) => {
      const { irPath, returnVal } = await compileAndRun(fileName, 'happy-paths')
      const ir = await fsPromises.readFile(irPath, 'utf-8')

      expect(ir).toMatchSnapshot()

      const expected = expectedResultsMapping[fileName]
      if (expected !== null && expected !== undefined) {
        expect(returnVal).toBe(expected)
      } else {
        throw new Error(
          `No expected results mapping found for "${fileName}". Please add an entry to expectedResultsMapping in happy-paths.test.ts for this file, including the expected return value.`
        )
      }
    }
  )
})
