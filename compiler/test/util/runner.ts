import path from 'path'
import { main } from '../../src/main'
import { execSync } from 'child_process'

const compilerDir = path.resolve(__dirname, '..')
export const testOutputDir = path.join(compilerDir, 'test-output')

export function compileToIR(fileName: string, subpath?: string): string {
  const inputPath = path.join(
    __dirname,
    '..',
    'language-files',
    subpath ?? '',
    `${fileName}.oli`
  )

  main(inputPath, testOutputDir, { quiet: true, throwOnError: true })

  return path.join(testOutputDir, `${fileName}.ll`)
}

export function runIr(fileName: string): [number, string] {
  const irPath = path.join(testOutputDir, `${fileName}.ll`)
  const binaryPath = path.join(testOutputDir, fileName)

  execSync(`clang -w ${irPath} -o ${binaryPath}`, {
    stdio: 'pipe',
    cwd: compilerDir,
  })

  try {
    const output = execSync(binaryPath, {
      stdio: 'pipe',
      encoding: 'utf-8',
      cwd: compilerDir,
    })
    return [0, output]
  } catch (error: any) {
    // have to do it this way to allow us to test with non-zero exit codes
    if (error.status !== null && error.status !== undefined) {
      return [error.status, error.stdout || '']
    }

    throw new Error(`Failed to execute binary: ${error.message}`)
  }
}

export function compileAndRun(
  fileName: string,
  subpath?: string
): { irPath: string; returnVal: number; stdout: string } {
  const irPath = compileToIR(fileName, subpath)
  const [returnVal, stdout] = runIr(fileName)

  return { irPath, returnVal, stdout }
}
