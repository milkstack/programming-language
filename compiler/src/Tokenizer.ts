import { Token } from './models/Token'
import {
  DOUBLE_CHAR_TOKEN_TYPE_MAP,
  TokenType,
  tokenTypeFromString,
} from './models/TokenType'
import { LexicalError } from './models/LexicalError'

export class Tokenizer {
  private characters: string[]
  private tokens: Token[]
  private lineNumberCursor: number
  private characterCursor: number
  public errors: LexicalError[]

  constructor(codeString: string) {
    this.characters = Array.from(codeString)
    this.tokens = []
    this.lineNumberCursor = 1
    this.characterCursor = 0
    this.errors = []
  }

  private peek(i?: number): string | undefined {
    if (!i) {
      return this.characters[0]
    }
    return this.characters[i]
  }

  private consumeChar(): string | undefined {
    if (this.peek()) {
      const ch = this.characters.shift()!
      if (ch === '\n') {
        this.lineNumberCursor += 1
        this.characterCursor = 0
      } else {
        this.characterCursor += 1
      }
      return ch
    }
    return undefined
  }

  private static isAlphanumericChar(character: string | undefined): boolean {
    if (!character) {
      return false
    }
    return /[a-zA-Z0-9_]/.test(character)
  }

  private consumeIntegerLiteralToken(): Token {
    const firstCharacter = this.peek()!
    if (firstCharacter === '0') {
      const secondCharacterOption = this.peek(1)
      if (secondCharacterOption && /\d/.test(secondCharacterOption)) {
        this.errors.push(
          new LexicalError(
            `Unexpected token '${secondCharacterOption}'`,
            this.lineNumberCursor,
            this.characterCursor + 2
          )
        )
      }
    }

    let tokenString = ''

    while (this.peek() && /\d/.test(this.peek()!)) {
      const currentCharOption = this.consumeChar()
      const currentCharacter = currentCharOption!
      tokenString += currentCharacter
    }

    const tokenType = TokenType.IntegerLiteral
    return new Token(
      tokenType,
      this.lineNumberCursor,
      this.characterCursor,
      tokenString
    )
  }

  private consumeAlphanumericToken(): Token {
    let tokenString = ''

    while (Tokenizer.isAlphanumericChar(this.peek())) {
      const currentCharOption = this.consumeChar()
      const currentCharacter = currentCharOption!
      tokenString += currentCharacter
    }

    let tokenType = tokenTypeFromString(tokenString)
    if (tokenType === TokenType.Unknown) {
      tokenType = TokenType.Identifier
    }

    return new Token(
      tokenType,
      this.lineNumberCursor,
      this.characterCursor,
      tokenString
    )
  }

  private checkForDoubleCharToken(): TokenType | undefined {
    const firstCharacter = this.peek()!
    const secondCharacter = this.peek(1)!

    if (!firstCharacter || !secondCharacter) {
      return undefined
    }

    const doubleChar = firstCharacter + secondCharacter

    return DOUBLE_CHAR_TOKEN_TYPE_MAP.get(doubleChar)
  }

  public tokenize(): [Token[], LexicalError[]] {
    while (this.peek()) {
      const character = this.peek()!

      if (character.trim() === '') {
        this.consumeChar()
        continue
      }

      if (/\d/.test(character)) {
        const token = this.consumeIntegerLiteralToken()
        this.tokens.push(token)
        continue
      }

      const isAlphanumericChar = Tokenizer.isAlphanumericChar(character)

      if (isAlphanumericChar) {
        const token = this.consumeAlphanumericToken()
        this.tokens.push(token)
        continue
      }

      const doubleCharTokenType = this.checkForDoubleCharToken()

      if (doubleCharTokenType) {
        const token = new Token(
          doubleCharTokenType,
          this.lineNumberCursor,
          this.characterCursor
        )
        this.tokens.push(token)
        this.consumeChar()
        this.consumeChar()
        continue
      }

      const consumedCharacter = this.consumeChar()!
      const tokenType = tokenTypeFromString(consumedCharacter)

      if (tokenType === TokenType.Unknown) {
        this.errors.push(
          new LexicalError(
            `Unknown token '${consumedCharacter}'`,
            this.lineNumberCursor,
            this.characterCursor
          )
        )
      }

      const token = new Token(
        tokenType,
        this.lineNumberCursor,
        this.characterCursor,
        null
      )
      this.tokens.push(token)
    }

    return [this.tokens.slice(), this.errors.slice()]
  }
}
