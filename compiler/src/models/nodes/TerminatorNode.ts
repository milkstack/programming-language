import { IntegerLiteralNode } from './IntegerLiteralNode'
import { IdentifierNode } from './IdentifierNode'
import { FunctionCallNode } from './FunctionCallNode'

export class TerminatorNode {
  public variant: IntegerLiteralNode | IdentifierNode | FunctionCallNode
  constructor(variant: IntegerLiteralNode | IdentifierNode | FunctionCallNode) {
    this.variant = variant
  }
}
