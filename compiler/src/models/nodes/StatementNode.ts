import { AssignmentNode } from './AssignmentNode'
import { ExpresssionStatementNode } from './ExpressionStatementNode'
import { ForLoopNode } from './ForLoopNode'
import { IfStatementNode } from './IfStatementNode'
import { ReturnNode } from './ReturnNode'
import { VariableDefinitionNode } from './VariableDefinitionNode'
import { WhileLoopNode } from './WhileLoopNode'

export class StatementNode {
  public variant:
    | ReturnNode
    | VariableDefinitionNode
    | ExpresssionStatementNode
    | IfStatementNode
    | ForLoopNode
    | AssignmentNode
    | WhileLoopNode

  constructor(
    variant:
      | ReturnNode
      | VariableDefinitionNode
      | ExpresssionStatementNode
      | IfStatementNode
      | ForLoopNode
      | AssignmentNode
      | WhileLoopNode
  ) {
    this.variant = variant
  }
}
