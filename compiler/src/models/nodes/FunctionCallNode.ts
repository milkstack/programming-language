import { Token } from '../Token'
import { ExpressionNode } from './ExpressionNode'

export class FunctionCallNode {
  public token: Token
  public args: ExpressionNode[]

  constructor(token: Token, args: ExpressionNode[]) {
    this.token = token
    this.args = args
  }
}
