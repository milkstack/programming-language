import { IfStatementNode } from './IfStatementNode'
import { PrototypeNode } from './PrototypeNode'
import { StatementNode } from './StatementNode'

export class FunctionNode {
  public proto: PrototypeNode
  public body: (StatementNode | IfStatementNode)[]

  constructor(proto: PrototypeNode, body: (StatementNode | IfStatementNode)[]) {
    this.proto = proto
    this.body = body
  }
}
