import * as fs from 'fs'
import * as path from 'path'
import { Tokenizer } from './Tokenizer'
import { Parser } from './Parser'
import { LexicalError } from './models/LexicalError'
import { ParseError } from './models/ParseError'
import { Generator } from './Generator'

function colorText(text: string, color: string): string {
  const colors: { [key: string]: string } = {
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    blue: '\x1b[94m',
    magenta: '\x1b[95m',
    cyan: '\x1b[96m',
  }
  const reset = '\x1b[0m'
  return colors[color] ? `${colors[color]}${text}${reset}` : text
}

function printErrors(errors: LexicalError[] | ParseError[]): void {
  console.log(colorText(`${errors.length} error(s) found`, 'red'))
  errors.forEach((error) => {
    console.log('')
    console.log(`${colorText('Error', 'red')}: ${error.message}`)
    console.log(`Line: ${error.lineNumber},`)
    if ('characterNumber' in error) {
      console.log(`Column: ${error.characterNumber}`)
    }
    console.log('')
  })
}

function printSuccess(duration: number): void {
  console.log(
    colorText(`Successfully compiled in ${duration} seconds`, 'green')
  )
}

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
    printErrors(lexicalErrors)
    process.exit(1)
  }

  const parser = new Parser(tokens)
  const programNode = parser.parseProgram()

  if (parser.error) {
    printErrors([parser.error])
    process.exit(1)
  }

  const generator = new Generator()
  const ir = generator.generateProgram(programNode!)
  if (ir) {
    fs.writeFileSync('output/output.ll', ir)
  }

  const duration = (Date.now() - startTime) / 1000

  printSuccess(duration)
  process.exit(0)
}

main()
