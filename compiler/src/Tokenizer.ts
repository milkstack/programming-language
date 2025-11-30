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

  private handleSingleLineComment = () => {
    while (true) {
      if (!this.peek()) {
        break
      }

      const char = this.consumeChar()
      if (char === '\n') {
        break
      }
    }
  }

  private handleMultiLineComment = () => {
    while (true) {
      if (!this.peek() || !this.peek(1)) {
        this.errors.push(
          new LexicalError(
            'Expected end of multiline comment "*/" but found EOF',
            this.lineNumberCursor,
            this.characterCursor
          )
        )
        break
      }

      const char = this.consumeChar()
      const next = this.peek()
      if (char === '*' && next === '/') {
        this.consumeChar() // Consume the closing '/'
        break
      }
    }
  }

  // pretty hacky. Turns i++ into i = i + 1
  private handlePlusPlus(tokenType: TokenType) {
    const identifier = this.tokens[this.tokens.length - 1]

    this.tokens.push(
      new Token(TokenType.Assign, this.lineNumberCursor, this.characterCursor)
    )

    this.tokens.push(identifier)

    this.tokens.push(
      new Token(
        tokenType === TokenType.PlusPlus ? TokenType.Plus : TokenType.Minus,
        this.lineNumberCursor,
        this.characterCursor
      )
    )

    this.tokens.push(
      new Token(
        TokenType.IntegerLiteral,
        this.lineNumberCursor,
        this.characterCursor,
        '1'
      )
    )

    this.consumeChar()
    this.consumeChar()
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
        if (
          doubleCharTokenType === TokenType.PlusPlus ||
          doubleCharTokenType === TokenType.MinusMinus
        ) {
          this.handlePlusPlus(doubleCharTokenType)
          continue
        }

        if (doubleCharTokenType === TokenType.SingleLineComment) {
          this.handleSingleLineComment()
          continue
        }
        // I don't _think_ I have to check for Ends and error since the top level parser with disallow that
        if (doubleCharTokenType === TokenType.MultiLineCommentStart) {
          this.handleMultiLineComment()
          continue
        }

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
