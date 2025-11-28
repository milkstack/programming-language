import { Token } from '../Token'

export class IntegerLiteralNode {
  public token: Token

  constructor(token: Token) {
    this.token = token
  }
}
