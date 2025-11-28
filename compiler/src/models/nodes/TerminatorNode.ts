import { IntegerLiteralNode } from './IntegerLiteralNode'
import { IdentifierNode } from './IdentifierNode'

export class TerminatorNode {
  public variant: IntegerLiteralNode | IdentifierNode
  constructor(variant: IntegerLiteralNode | IdentifierNode) {
    this.variant = variant
  }
}
