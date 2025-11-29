import { ExpressionNode } from './ExpressionNode'
import { IdentifierNode } from './IdentifierNode'

export class AssignmentNode {
  public identifier: IdentifierNode
  public expression: ExpressionNode

  constructor(identifier: IdentifierNode, expression: ExpressionNode) {
    this.identifier = identifier
    this.expression = expression
  }
}
