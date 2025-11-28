import { Token } from '../Token'

export class IdentifierNode {
  public token: Token

  constructor(token: Token) {
    this.token = token
  }
}
