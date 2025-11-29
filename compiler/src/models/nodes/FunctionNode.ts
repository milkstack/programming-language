import { PrototypeNode } from './PrototypeNode'
import { StatementNode } from './StatementNode'

export class FunctionNode {
  public proto: PrototypeNode
  public body: StatementNode[]

  constructor(proto: PrototypeNode, body: StatementNode[]) {
    this.proto = proto
    this.body = body
  }
}
