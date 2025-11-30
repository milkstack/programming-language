import path from 'path'
import { main } from '../../src/main'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

export async function runIr(fileName: string): Promise<[number, string]> {
  const irPath = path.join(testOutputDir, `${fileName}.ll`)
  const binaryPath = path.join(testOutputDir, fileName)

  await execAsync(`clang -w ${irPath} -o ${binaryPath}`, {
    cwd: compilerDir,
  })

  try {
    const { stdout } = await execAsync(binaryPath, {
      encoding: 'utf-8',
      cwd: compilerDir,
    })
    return [0, stdout]
  } catch (error: any) {
    // have to do it this way to allow us to test with non-zero exit codes
    if (error.code !== null && error.code !== undefined) {
      return [error.code, error.stdout || '']
    }

    throw new Error(`Failed to execute binary: ${error.message}`)
  }
}

export async function compileAndRun(
  fileName: string,
  subpath?: string
): Promise<{ irPath: string; returnVal: number; stdout: string }> {
  const irPath = compileToIR(fileName, subpath)
  const [returnVal, stdout] = await runIr(fileName)

  return { irPath, returnVal, stdout }
}
