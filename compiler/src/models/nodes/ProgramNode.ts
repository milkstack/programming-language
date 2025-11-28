import { FunctionNode } from './FunctionNode'
import { VariableDefinitionNode } from './VariableDefinitionNode'
// import { StatementNode } from './StatementNode'

export class ProgramNode {
  // public statements: StatementNode[]
  public functions: FunctionNode[] = []
  public globalVariables: VariableDefinitionNode[] = []
  public mainFunction: FunctionNode | undefined

  constructor(
    functions: FunctionNode[],
    globalVariables: VariableDefinitionNode[],
    mainFunction: FunctionNode | undefined
  ) {
    this.functions = functions
    this.globalVariables = globalVariables
    this.mainFunction = mainFunction
  }
}
