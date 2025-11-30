import { AssignmentNode } from './AssignmentNode'
import { BreakStatementNode } from './BreakStatementNode'
import { ContinueStatementNode } from './ContinueStatementNode'
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
    | BreakStatementNode
    | ContinueStatementNode

  constructor(
    variant:
      | ReturnNode
      | VariableDefinitionNode
      | ExpresssionStatementNode
      | IfStatementNode
      | ForLoopNode
      | AssignmentNode
      | WhileLoopNode
      | BreakStatementNode
      | ContinueStatementNode
  ) {
    this.variant = variant
  }
}
