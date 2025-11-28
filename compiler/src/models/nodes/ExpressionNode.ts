import { BinaryExpressionNode } from './BinaryExpressionNode'
import { TerminatorNode } from './TerminatorNode'

export class ExpressionNode {
  public variant: TerminatorNode | BinaryExpressionNode

  constructor(variant: TerminatorNode | BinaryExpressionNode) {
    this.variant = variant
  }
}
