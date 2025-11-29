import { ExpressionNode } from './ExpressionNode'
import { StatementNode } from './StatementNode'

export class IfStatementNode {
  public condition: ExpressionNode

  public thenStatements: StatementNode[]
  public elseIfStatement: IfStatementNode | undefined
  public elseStatements: StatementNode[] | undefined

  constructor(
    condition: ExpressionNode,
    thenStatements: StatementNode[],
    elseIfStatement: IfStatementNode | undefined,
    elseStatements?: StatementNode[]
  ) {
    this.condition = condition
    this.thenStatements = thenStatements
    this.elseIfStatement = elseIfStatement
    this.elseStatements = elseStatements
  }
}
