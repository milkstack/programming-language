import * as fs from 'fs'
import * as path from 'path'
import { main } from '../src/main'
import { testOutputDir } from './util/runner'

const sadPathsDir = path.join(
  __dirname,
  'language-files',
  'ai-generated-sad-paths'
)

function getAllSadPathFiles(): string[] {
  const files = fs.readdirSync(sadPathsDir)
  return files
    .filter((file) => file.endsWith('.oli'))
    .map((file) => path.basename(file, '.oli'))
}

function compileSadPathToIR(fileName: string): string {
  const inputPath = path.join(sadPathsDir, `${fileName}.oli`)

  main(inputPath, testOutputDir, {
    throwOnError: true,
    silent: true,
  })
  return path.join(testOutputDir, `${fileName}.ll`)
}

describe('Sad Path Tests - Error Cases', () => {
  const sadPathFiles = getAllSadPathFiles()

  describe('Lexical Errors', () => {
    const lexicalErrorFiles = sadPathFiles.filter((name) =>
      name.startsWith('lexical-error-')
    )

    it.each(lexicalErrorFiles)('should throw error for %s', (fileName) => {
      expect(() => {
        compileSadPathToIR(fileName)
      }).toThrow()
    })
  })

  describe('Parse Errors', () => {
    const parseErrorFiles = sadPathFiles.filter((name) =>
      name.startsWith('parse-error-')
    )

    it.each(parseErrorFiles)('should throw error for %s', (fileName) => {
      expect(() => {
        compileSadPathToIR(fileName)
      }).toThrow()
    })
  })

  describe('Generator Errors', () => {
    const generatorErrorFiles = sadPathFiles.filter((name) =>
      name.startsWith('generator-error-')
    )

    it.each(generatorErrorFiles)('should throw error for %s', (fileName) => {
      expect(() => {
        compileSadPathToIR(fileName)
      }).toThrow()
    })
  })

  describe('All Error Cases', () => {
    it.each(sadPathFiles)('should fail compilation for %s', (fileName) => {
      expect(() => {
        compileSadPathToIR(fileName)
      }).toThrow()
    })
  })
})
