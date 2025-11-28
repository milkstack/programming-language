import { ReturnNode } from './ReturnNode'
import { VariableDefinitionNode } from './VariableDefinitionNode'

export class StatementNode {
  public variant: ReturnNode | VariableDefinitionNode

  constructor(variant: ReturnNode | VariableDefinitionNode) {
    this.variant = variant
  }
}
