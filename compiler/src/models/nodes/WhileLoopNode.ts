import { ExpressionNode } from './ExpressionNode'
import { StatementNode } from './StatementNode'

export class WhileLoopNode {
  public condition: ExpressionNode
  public body: StatementNode[] = []

  constructor(condition: ExpressionNode, body: StatementNode[]) {
    this.condition = condition
    this.body = body
  }
}
