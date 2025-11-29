import path from 'path'
import { main } from '../../src/main'
import { execSync } from 'child_process'

path
const compilerDir = path.resolve(__dirname, '..')
export const testOutputDir = path.join(compilerDir, 'test-output')

export function getLanguageFilePath(): string {
  const testPath = expect.getState().testPath
  if (!testPath) {
    throw new Error('Could not determine test file path')
  }

  const baseName = path.basename(testPath, '.test.ts')

  return path.join(path.dirname(testPath), 'language-files', `${baseName}.oli`)
}

export function compileToIR(fileName: string): string {
  const inputPath = path.join(
    __dirname,
    '..',
    'language-files',
    `${fileName}.oli`
  )

  main(inputPath, testOutputDir, { quiet: true, throwOnError: true })

  return path.join(testOutputDir, `${fileName}.ll`)
}

export function runIr(fileName: string): number {
  const irPath = path.join(testOutputDir, `${fileName}.ll`)
  const binaryPath = path.join(testOutputDir, fileName)

  execSync(`clang -w ${irPath} -o ${binaryPath}`, {
    stdio: 'pipe',
    cwd: compilerDir,
  })

  try {
    execSync(binaryPath, {
      stdio: 'pipe',
      cwd: compilerDir,
    })
    return 0
  } catch (error: any) {
    // have to do it this way to allow us to test with non-zero exit codes
    if (error.status !== null && error.status !== undefined) {
      return error.status
    }

    throw new Error(`Failed to execute binary: ${error.message}`)
  }
}

export function compileAndRun(fileName: string): [string, number] {
  const irPath = compileToIR(fileName)
  const returnVal = runIr(fileName)

  return [irPath, returnVal]
}
