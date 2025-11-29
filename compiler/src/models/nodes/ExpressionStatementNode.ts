import { ExpressionNode } from './ExpressionNode'

export class ExpresssionStatementNode {
  public expression: ExpressionNode

  constructor(expression: ExpressionNode) {
    this.expression = expression
  }
}
