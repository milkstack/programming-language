import { ExpressionNode } from './ExpressionNode'
import { StatementNode } from './StatementNode'

export class IfStatementNode {
  public condition: ExpressionNode

  public thenStatements: (StatementNode | IfStatementNode)[]
  public elseIfStatement: IfStatementNode | undefined
  public elseStatements: (StatementNode | IfStatementNode)[] | undefined

  constructor(
    condition: ExpressionNode,
    thenStatements: (StatementNode | IfStatementNode)[],
    elseIfStatement: IfStatementNode | undefined,
    elseStatements?: (StatementNode | IfStatementNode)[]
  ) {
    this.condition = condition
    this.thenStatements = thenStatements
    this.elseIfStatement = elseIfStatement
    this.elseStatements = elseStatements
  }
}
