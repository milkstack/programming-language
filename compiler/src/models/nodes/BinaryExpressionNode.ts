import { ExpressionNode } from './ExpressionNode'
import { Token } from '../Token'

export class BinaryExpressionNode {
  constructor(
    public left: ExpressionNode,
    public operator: Token,
    public right: ExpressionNode
  ) {}
}
