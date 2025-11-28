export class ParseError {
  public message: string
  public lineNumber: number
  // public characterNumber: number

  constructor(message: string, lineNumber: number) {
    this.message = message
    this.lineNumber = lineNumber
    //   this.characterNumber = characterNumber
  }
}
