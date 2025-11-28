import { Token } from '../Token'
import { ExpressionNode } from './ExpressionNode'

export class VariableDefinitionNode {
  public token: Token
  public expression: ExpressionNode

  constructor(token: Token, expression: ExpressionNode) {
    this.token = token
    this.expression = expression
  }
}

