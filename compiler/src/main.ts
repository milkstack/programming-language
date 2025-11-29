import * as fs from 'fs'
import * as path from 'path'
import { Tokenizer } from './Tokenizer'
import { Parser } from './Parser'
import { Generator } from './Generator'
import { Logger } from './utils/Logger'
import { ErrorHandler } from './utils/ErrorHandler'

interface Options {
  silent?: boolean
  quiet?: boolean
  throwOnError?: boolean
}

export function main(
  filePath: string,
  outputDir: string,
  options?: Options
): void {
  const startTime = Date.now()
  const fileString = fs.readFileSync(filePath, 'utf-8')

  // TODO: There's a better way to do this. -- logLevel? is that what the kids call it these days?
  const silent = options?.silent ?? false
  const quiet = options?.quiet ?? false
  Logger.setSilent(silent)
  Logger.setQuiet(quiet)

  const throwOnError = options?.throwOnError ?? false
  ErrorHandler.setThrowOnError(throwOnError)

  const tokenizer = new Tokenizer(fileString)
  const [tokens, lexicalErrors] = tokenizer.tokenize()

  if (lexicalErrors.length > 0) {
    Logger.logErrors(lexicalErrors)
    ErrorHandler.exitOrThrow(1)
  }

  const parser = new Parser(tokens)
  const programNode = parser.parseProgram()

  // programNode?.mainFunction?.body.forEach((statement) => {
  //   console.log(statement)
  // })

  const generator = new Generator()
  const ir = generator.generateProgram(programNode!)

  const inputFileName = filePath.split(/[/\\]/).pop()

  if (!inputFileName) {
    if (!silent) {
      console.error('Invalid file path')
    }
    ErrorHandler.exitOrThrow(1)
  }

  const extension = inputFileName.slice(
    (Math.max(0, inputFileName.lastIndexOf('.')) || Infinity) + 1
  )

  if (extension !== 'oli') {
    if (!silent) {
      console.error(
        `Expected an entry point with extension .oli, but found ${inputFileName}`
      )
    }
    ErrorHandler.exitOrThrow(1)
  }

  const outputFileName = inputFileName.replace('.oli', '.ll')
  const outputPath = path.join(outputDir, outputFileName)

  if (ir) {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(outputPath, ir)
  }

  const duration = (Date.now() - startTime) / 1000

  Logger.printSuccess(duration)
}
