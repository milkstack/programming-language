import { AssignmentNode } from './AssignmentNode'
import { ExpressionNode } from './ExpressionNode'
import { StatementNode } from './StatementNode'
import { VariableDefinitionNode } from './VariableDefinitionNode'

export class ForLoopNode {
  public variableDefinition: VariableDefinitionNode
  public condition: ExpressionNode
  public iterator: AssignmentNode
  public body: StatementNode[] = []

  constructor(
    variableDefinition: VariableDefinitionNode,
    condition: ExpressionNode,
    iterator: AssignmentNode,
    body: StatementNode[]
  ) {
    this.variableDefinition = variableDefinition
    this.condition = condition
    this.iterator = iterator
    this.body = body
  }
}
