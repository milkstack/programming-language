import { BinaryExpressionNode } from './BinaryExpressionNode'
import { FunctionCallNode } from './FunctionCallNode'
import { TerminatorNode } from './TerminatorNode'

export class ExpressionNode {
  public variant: TerminatorNode | BinaryExpressionNode | FunctionCallNode

  constructor(
    variant: TerminatorNode | BinaryExpressionNode | FunctionCallNode
  ) {
    this.variant = variant
  }
}
