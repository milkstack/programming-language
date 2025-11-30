import { TokenType } from './TokenType'

export class Token {
  public tokenType: TokenType
  public value: string | null
  public lineNumber: number
  public characterNumber: number

  constructor(
    tokenType: TokenType,
    lineNumber: number,
    characterNumber: number,
    value: string | null = null
  ) {
    this.tokenType = tokenType
    this.value = value
    this.lineNumber = lineNumber
    this.characterNumber = characterNumber
  }
}
