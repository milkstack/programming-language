import * as fs from 'fs'
import * as path from 'path'
import { Tokenizer } from './Tokenizer'
import { Parser } from './Parser'
import { Generator } from './Generator'
import { Logger } from './Logger'

/*

Currently supports:
- integer literals
- variables
- if statements
- return statements
- arithmetic operations
- comparison operations
- parentheses
- function definitions
- global variables
- local variables

*/
function main(): void {
  const startTime = Date.now()

  const filePath = path.join(__dirname, '../../language/test.oli')
  const fileString = fs.readFileSync(filePath, 'utf-8')

  const tokenizer = new Tokenizer(fileString)
  const [tokens, lexicalErrors] = tokenizer.tokenize()

  if (lexicalErrors.length > 0) {
    Logger.logErrors(lexicalErrors)
    process.exit(1)
  }

  const parser = new Parser(tokens)
  const programNode = parser.parseProgram()

  programNode?.mainFunction?.body.forEach((statement) => {
    console.log(statement)
  })

  const generator = new Generator()
  const ir = generator.generateProgram(programNode!)

  if (ir) {
    fs.writeFileSync('output/output.ll', ir)
  }

  const duration = (Date.now() - startTime) / 1000

  Logger.printSuccess(duration)
  process.exit(0)
}

main()
