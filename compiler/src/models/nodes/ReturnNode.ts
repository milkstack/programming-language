import { ExpressionNode } from './ExpressionNode'

export class ReturnNode {
  public expression: ExpressionNode
  constructor(expression: ExpressionNode) {
    this.expression = expression
  }
}
