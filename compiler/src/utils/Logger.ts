/* istanbul ignore file */

import { GeneratorError } from '../models/GeneratorError'
import { LexicalError } from '../models/LexicalError'
import { ParseError } from '../models/ParseError'

export class Logger {
  private static silent: boolean = false
  private static quiet: boolean = false

  static setSilent(silent: boolean): void {
    Logger.silent = silent
  }

  static setQuiet(quiet: boolean): void {
    Logger.quiet = quiet
  }

  static colorText(text: string, color: string): string {
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

  static logErrors(
    errors: LexicalError[] | ParseError[] | GeneratorError[]
  ): void {
    if (Logger.silent) {
      return
    }
    console.log(Logger.colorText(`${errors.length} error(s) found`, 'red'))
    errors.forEach((error) => {
      console.log('')
      console.log(`${Logger.colorText('Error', 'red')}: ${error.message}`)

      if ('lineNumber' in error) {
        console.log(`Line: ${error.lineNumber},`)
      }

      if ('characterNumber' in error) {
        console.log(`Column: ${error.characterNumber}`)
      }
      console.log('')
    })
  }

  static printSuccess(duration: number): void {
    if (Logger.quiet || Logger.silent) {
      return
    }
    console.log(
      this.colorText(`Successfully compiled in ${duration} seconds`, 'green')
    )
  }
}
