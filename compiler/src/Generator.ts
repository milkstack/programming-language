import llvm from 'llvm-bindings'
import { IntegerLiteralNode } from './models/nodes/IntegerLiteralNode'
import { VariableDefinitionNode } from './models/nodes/VariableDefinitionNode'
import { IdentifierNode } from './models/nodes/IdentifierNode'
import { ReturnNode } from './models/nodes/ReturnNode'
import { GeneratorError } from './models/GeneratorError'
import { ProgramNode } from './models/nodes/ProgramNode'
import { TokenType } from './models/TokenType'
import { ExpressionNode } from './models/nodes/ExpressionNode'
import { BinaryExpressionNode } from './models/nodes/BinaryExpressionNode'
import { TerminatorNode } from './models/nodes/TerminatorNode'
import { FunctionNode } from './models/nodes/FunctionNode'
import { StatementNode } from './models/nodes/StatementNode'
import { IfStatementNode } from './models/nodes/IfStatementNode'

export class Generator {
  private GlobalVariablesMap: Map<string, llvm.Value> = new Map()
  private Builder: llvm.IRBuilder
  private Context: llvm.LLVMContext
  private Module: llvm.Module
  private Function: llvm.Function | undefined
  public error: GeneratorError | undefined

  constructor() {
    this.Context = new llvm.LLVMContext()
    this.Module = new llvm.Module('main', this.Context)
    this.Builder = new llvm.IRBuilder(this.Context)
  }

  private generateIntegerLiteral(node: IntegerLiteralNode) {
    const int32Type = llvm.Type.getInt32Ty(this.Context)
    return llvm.ConstantInt.get(int32Type, parseInt(node.token.value!, 10))
  }

  private generateIdentifier(
    node: IdentifierNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value | undefined {
    const varName = node.token.value!

    let variable: llvm.Value | undefined = localVariablesMap.get(varName)
    const isGlobal = !variable && this.GlobalVariablesMap.has(varName)

    if (!variable && !isGlobal) {
      this.error = new GeneratorError(`Undefined variable: ${varName}`)
      return undefined
    }

    if (isGlobal) {
      variable = this.GlobalVariablesMap.get(varName)!
    }

    return this.Builder.CreateLoad(
      llvm.Type.getInt32Ty(this.Context),
      variable!,
      varName
    )
  }

  private generateExpression(
    node: ExpressionNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value | undefined {
    if (node.variant instanceof TerminatorNode) {
      if (node.variant.variant instanceof IntegerLiteralNode) {
        return this.generateIntegerLiteral(node.variant.variant)
      } else if (node.variant.variant instanceof IdentifierNode) {
        return this.generateIdentifier(node.variant.variant, localVariablesMap)
      }
    } else if (node.variant instanceof BinaryExpressionNode) {
      return this.generateBinaryExpression(node.variant, localVariablesMap)
    }

    this.error = new GeneratorError(
      `Unsupported expression type: ${node.variant}`
    )
    return undefined
  }

  private generateBinaryExpression(
    node: BinaryExpressionNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value | undefined {
    const left = this.generateExpression(node.left, localVariablesMap)
    const right = this.generateExpression(node.right, localVariablesMap)

    if (!left || !right) {
      return undefined
    }

    switch (node.operator.tokenType) {
      // Arithmetic operators
      case TokenType.Plus:
        return this.Builder.CreateAdd(left, right)
      case TokenType.Minus:
        return this.Builder.CreateSub(left, right)
      case TokenType.Star:
        return this.Builder.CreateMul(left, right)
      case TokenType.Slash:
        return this.Builder.CreateSDiv(left, right)
      // Comparison operators (return i1 boolean)
      case TokenType.Equal:
        return this.Builder.CreateICmpEQ(left, right)
      case TokenType.NotEqual:
        return this.Builder.CreateICmpNE(left, right)
      case TokenType.LessThan:
        return this.Builder.CreateICmpSLT(left, right)
      case TokenType.GreaterThan:
        return this.Builder.CreateICmpSGT(left, right)
      case TokenType.LessThanEqual:
        return this.Builder.CreateICmpSLE(left, right)
      case TokenType.GreaterThanEqual:
        return this.Builder.CreateICmpSGE(left, right)
      default:
        this.error = new GeneratorError(
          `Unsupported operator: ${node.operator.tokenType}`
        )
        return undefined
    }
  }

  private generateVariableDefinition(
    node: VariableDefinitionNode,
    variablesMap: Map<string, llvm.Value>,
    isGlobal: boolean = false
  ): void {
    const varName = node.token.value!

    if (variablesMap.has(varName)) {
      this.error = new GeneratorError(`Variable ${varName} already defined`)
      process.exit(1)
    }

    let variable: llvm.Value

    if (isGlobal) {
      const int32Type = llvm.Type.getInt32Ty(this.Context)
      const globalVar = new llvm.GlobalVariable(
        this.Module,
        int32Type,
        false, // isConstant
        llvm.GlobalValue.LinkageTypes.InternalLinkage,
        llvm.ConstantInt.get(int32Type, 0),
        varName
      )
      variable = globalVar
    } else {
      variable = this.Builder.CreateAlloca(
        llvm.Type.getInt32Ty(this.Context),
        null,
        varName
      )
    }

    variablesMap.set(varName, variable)

    const localMapForExpression = isGlobal
      ? new Map<string, llvm.Value>()
      : variablesMap

    const expressionValue = this.generateExpression(
      node.expression,
      localMapForExpression
    )

    if (expressionValue) {
      this.Builder.CreateStore(expressionValue, variable)
    }
  }

  private generateReturn(
    node: ReturnNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value | undefined {
    const expressionValue = this.generateExpression(
      node.expression,
      localVariablesMap
    )
    if (!expressionValue) {
      return undefined
    }

    return this.Builder.CreateRet(expressionValue)
  }

  // I don't think I ever understood what I was doing here
  private generateIfStatement(
    node: IfStatementNode,
    variablesMap: Map<string, llvm.Value>,
    mergeBlock?: llvm.BasicBlock
  ): void {
    const condition = this.generateExpression(node.condition, variablesMap)
    if (!condition) {
      return
    }

    const thenBlock = llvm.BasicBlock.Create(
      this.Context,
      'then',
      this.Function
    )
    const elseBlock = llvm.BasicBlock.Create(
      this.Context,
      'else',
      this.Function
    )

    const endifBlock =
      mergeBlock || llvm.BasicBlock.Create(this.Context, 'endif', this.Function)

    let branchedToEndif = false

    this.Builder.CreateCondBr(condition, thenBlock, elseBlock)

    this.Builder.SetInsertPoint(thenBlock)
    this.generateFunctionBody(node.thenStatements, variablesMap)

    if (!this.Builder.GetInsertBlock()!.getTerminator()) {
      this.Builder.CreateBr(endifBlock)
      branchedToEndif = true
    }

    if (node.elseStatements && node.elseStatements.length > 0) {
      this.Builder.SetInsertPoint(elseBlock)
      this.generateFunctionBody(node.elseStatements, variablesMap)

      if (!this.Builder.GetInsertBlock()!.getTerminator()) {
        this.Builder.CreateBr(endifBlock)
        branchedToEndif = true
      }
    } else if (node.elseIfStatement) {
      this.Builder.SetInsertPoint(elseBlock)
      this.generateIfStatement(node.elseIfStatement, variablesMap, endifBlock)

      const currentBlock = this.Builder.GetInsertBlock()
      if (currentBlock && !currentBlock.getTerminator()) {
        this.Builder.CreateBr(endifBlock)
        branchedToEndif = true
      }
    } else {
      this.Builder.SetInsertPoint(elseBlock)
      this.Builder.CreateBr(endifBlock)
      branchedToEndif = true
    }

    if (!mergeBlock) {
      this.Builder.SetInsertPoint(endifBlock)

      if (!branchedToEndif) {
        this.Builder.CreateUnreachable()
      }
    }
  }

  private generateFunctionBody(
    body: (StatementNode | IfStatementNode)[],
    variablesMap: Map<string, llvm.Value>
  ): void {
    for (const statement of body) {
      if (statement instanceof StatementNode) {
        if (statement.variant instanceof VariableDefinitionNode) {
          this.generateVariableDefinition(
            statement.variant,
            variablesMap,
            false
          )
        } else if (statement.variant instanceof ReturnNode) {
          this.generateReturn(statement.variant, variablesMap)
        }
      } else if (statement instanceof IfStatementNode) {
        this.generateIfStatement(statement, variablesMap)
      }
    }
  }

  // TODO?: Require a return statement in the main function
  // TODO: Require a return from all functions unless void
  private generateFunction(node: FunctionNode): void {
    const variablesMap = new Map<string, llvm.Value>()

    const functionName = node.proto.name
    const functionType = llvm.FunctionType.get(
      llvm.Type.getInt32Ty(this.Context),
      false
    )
    const _function = llvm.Function.Create(
      functionType,
      llvm.Function.LinkageTypes.ExternalLinkage,
      functionName,
      this.Module
    )
    const entryBlock = llvm.BasicBlock.Create(this.Context, 'entry', _function)
    this.Builder.SetInsertPoint(entryBlock)

    this.generateFunctionBody(node.body, variablesMap)
  }

  public generateProgram(program: ProgramNode): string | undefined {
    const returnType = llvm.Type.getInt32Ty(this.Context)
    const functionType = llvm.FunctionType.get(returnType, false)
    this.Function = llvm.Function.Create(
      functionType,
      llvm.Function.LinkageTypes.ExternalLinkage,
      'main',
      this.Module
    )

    const entryBlock = llvm.BasicBlock.Create(
      this.Context,
      'entry',
      this.Function
    )
    this.Builder.SetInsertPoint(entryBlock)

    for (const globalVariableDefinition of program.globalVariables) {
      const varName = globalVariableDefinition.token.value!
      if (this.GlobalVariablesMap.has(varName)) {
        this.error = new GeneratorError(`Variable ${varName} already defined`)
        return undefined
      }

      const int32Type = llvm.Type.getInt32Ty(this.Context)
      const globalVar = new llvm.GlobalVariable(
        this.Module,
        int32Type,
        false, // isConstant
        llvm.GlobalValue.LinkageTypes.InternalLinkage,
        llvm.ConstantInt.get(int32Type, 0),
        varName
      )
      this.GlobalVariablesMap.set(varName, globalVar)
    }

    for (const globalVariableDefinition of program.globalVariables) {
      if (this.error) break
      const varName = globalVariableDefinition.token.value!
      const variable = this.GlobalVariablesMap.get(varName)!

      const localMapForExpression = new Map<string, llvm.Value>()
      const expressionValue = this.generateExpression(
        globalVariableDefinition.expression,
        localMapForExpression
      )

      if (expressionValue) {
        this.Builder.CreateStore(expressionValue, variable)
      }
    }

    if (!program.mainFunction) {
      this.error = new GeneratorError('Main function not found')
      return undefined
    }

    const mainVariablesMap = new Map<string, llvm.Value>()
    this.generateFunctionBody(program.mainFunction.body, mainVariablesMap)

    for (const functionDefinition of program.functions) {
      this.generateFunction(functionDefinition)
    }

    if (this.error) {
      return undefined
    }

    return this.Module.print()
  }
}
