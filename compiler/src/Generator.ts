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
import { ExpresssionStatementNode } from './models/nodes/ExpressionStatementNode'
import { FunctionCallNode } from './models/nodes/FunctionCallNode'
import { ForLoopNode } from './models/nodes/ForLoopNode'
import { AssignmentNode } from './models/nodes/AssignmentNode'
import { Logger } from './utils/Logger'
import { WhileLoopNode } from './models/nodes/WhileLoopNode'
import { ErrorHandler } from './utils/ErrorHandler'
import { BreakStatementNode } from './models/nodes/BreakStatementNode'
import { ContinueStatementNode } from './models/nodes/ContinueStatementNode'
import { RESERVED_NAMES } from './constants/ReservedNames'

export class Generator {
  private GlobalVariablesMap: Map<string, llvm.Value> = new Map()
  private Builder: llvm.IRBuilder
  private Context: llvm.LLVMContext
  private Module: llvm.Module
  // I'm like 90% sure Function isn't needed
  private Function: llvm.Function | undefined
  private loopEndBlocks: llvm.BasicBlock[] = []
  private loopContinueBlocks: llvm.BasicBlock[] = []

  private printfFunction: llvm.Function | null = null
  private printFormatString: llvm.GlobalVariable | null = null

  constructor() {
    this.Context = new llvm.LLVMContext()
    this.Module = new llvm.Module('main', this.Context)
    this.Builder = new llvm.IRBuilder(this.Context)

    this.createCLibPrintF()
  }

  // apparently the only(?) way to accomplish printing using LLVM is to leverage printf from C
  private createCLibPrintF(): void {
    const int32Type = llvm.Type.getInt32Ty(this.Context)
    const int8PtrType = llvm.Type.getInt8PtrTy(this.Context)
    const printfType = llvm.FunctionType.get(int32Type, [int8PtrType], true) // true = variadic

    this.printfFunction = llvm.Function.Create(
      printfType,
      llvm.Function.LinkageTypes.ExternalLinkage,
      'printf',
      this.Module
    )

    const formatString = '%d\n'
    const formatStringType = llvm.ArrayType.get(
      llvm.Type.getInt8Ty(this.Context),
      formatString.length + 1 // +1 for null terminator
    )

    this.printFormatString = new llvm.GlobalVariable(
      this.Module,
      formatStringType,
      true, // isConstant
      llvm.GlobalValue.LinkageTypes.PrivateLinkage,
      llvm.ConstantDataArray.getString(this.Context, formatString, true), // true = null-terminated
      'print_format'
    )
  }

  private generateIntegerLiteral(node: IntegerLiteralNode): llvm.ConstantInt {
    const int32Type = llvm.Type.getInt32Ty(this.Context)
    const value = this.assertExists(node.token.value, 'generateIntegerLiteral')
    return llvm.ConstantInt.get(int32Type, parseInt(value, 10))
  }

  // i THINK that this should only happen due to a bug in the compiler
  private assertExists<T>(value: T | undefined | null, location: string): T {
    if (value === undefined || value === null) {
      Logger.logErrors([
        new GeneratorError(`Value doesn't exist at ${location}`),
      ])

      ErrorHandler.exitOrThrow(1)
    }

    return value
  }

  private generateIdentifier(
    node: IdentifierNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value {
    const varName = node.token.value!

    const variable: llvm.Value = this.assertExists(
      localVariablesMap.get(varName) ?? this.GlobalVariablesMap.get(varName),
      'generateIdentifier'
    )

    return this.Builder.CreateLoad(
      llvm.Type.getInt32Ty(this.Context),
      variable,
      varName
    )
  }

  private generateFunctionCall(
    node: FunctionCallNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value {
    const functionName = this.assertExists(
      node.token.value,
      'generateFunctionCall -- functionName'
    )!

    if (functionName === 'print') {
      return this.generatePrint(node, localVariablesMap)
    }

    const _function = this.assertExists(
      this.Module.getFunction(functionName),
      'generateFunctionCall -- function'
    )
    const args = node.args.map((arg) =>
      this.generateExpression(arg, localVariablesMap)
    )

    // We should never get here unless we have a bug
    /* istanbul ignore next */
    if (args.length !== node.args.length) {
      Logger.logErrors([
        new GeneratorError(
          `Mismatched argument length ${args.length} vs ${node.args.length}`
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    return this.Builder.CreateCall(_function, args)
  }

  // convert non comparison expressions into bool(x > 1)
  private convertConditionToBoolean(rawCondition: llvm.Value): llvm.Value {
    const condType = rawCondition.getType()
    if (condType.isIntegerTy(1)) {
      return rawCondition
    } else {
      const int32Type = llvm.Type.getInt32Ty(this.Context)
      const zero = llvm.ConstantInt.get(int32Type, 0)
      return this.Builder.CreateICmpNE(rawCondition, zero)
    }
  }

  private generateWhileLoop(
    node: WhileLoopNode,
    localVariablesMap: Map<string, llvm.Value>
  ): void {
    // get our current building block. this is something like our current "cursor" as we write out the llvm ir
    const currentBlock = this.assertExists(
      this.Builder.GetInsertBlock(),
      'generateWhileLoop -- currentBlock'
    )
    // get the function that our cursor is inside of
    const _function = this.assertExists(
      currentBlock.getParent(),
      'generateWhileLoop -- _function'
    )

    // create, but don't write out basic blocks for:
    // loop condition
    // the body of our loop
    // where to "release" the program back to when the loop ends

    const loopCondBB = llvm.BasicBlock.Create(
      this.Context,
      'while.cond',
      _function
    )
    const loopBodyBB = llvm.BasicBlock.Create(
      this.Context,
      'while.body',
      _function
    )

    const loopEndBB = llvm.BasicBlock.Create(
      this.Context,
      'while.end',
      _function
    )

    // create a logical branch and set our cursor to it
    this.Builder.CreateBr(loopCondBB)
    this.Builder.SetInsertPoint(loopCondBB)

    const rawCondition = this.assertExists(
      this.generateExpression(node.condition, localVariablesMap),
      'generateWhileLoop -- rawCondition'
    )
    const condition = this.convertConditionToBoolean(rawCondition)

    // creates an actual "check" for the condition
    this.Builder.CreateCondBr(condition, loopBodyBB, loopEndBB)

    // populates the body of of the loop
    this.Builder.SetInsertPoint(loopBodyBB)

    // keep track of loop blocks onto stack for break/continue statements
    this.loopEndBlocks.push(loopEndBB)
    this.loopContinueBlocks.push(loopCondBB)
    this.generateFunctionBody(node.body, localVariablesMap)
    // remove loop blocks from stack once we've generated the body of the loop
    this.loopEndBlocks.pop()
    this.loopContinueBlocks.pop()

    // once we reach the end of the body
    // tie the end of the body to the beginning of the loop conditionally

    /* this would indicate a bug earlier */
    /* istanbul ignore else */
    if (!this.Builder.GetInsertBlock()?.getTerminator()) {
      this.Builder.CreateBr(loopCondBB)
    }

    // set our cursor back to the "after loop" section
    this.Builder.SetInsertPoint(loopEndBB)
  }

  private generateForLoop(
    node: ForLoopNode,
    localVariablesMap: Map<string, llvm.Value>
  ): void {
    const currentBlock = this.assertExists(
      this.Builder.GetInsertBlock(),
      'generateForLoop -- currentBlock'
    )
    const _function = this.assertExists(
      currentBlock.getParent(),
      'generateForLoop -- _function'
    )

    this.generateVariableDefinition(
      node.variableDefinition,
      localVariablesMap,
      false
    )

    const loopCondBB = llvm.BasicBlock.Create(
      this.Context,
      'for.cond',
      _function
    )
    const loopBodyBB = llvm.BasicBlock.Create(
      this.Context,
      'for.body',
      _function
    )
    const loopIterBB = llvm.BasicBlock.Create(
      this.Context,
      'for.iter',
      _function
    )
    const loopEndBB = llvm.BasicBlock.Create(this.Context, 'for.end', _function)

    this.Builder.CreateBr(loopCondBB)
    this.Builder.SetInsertPoint(loopCondBB)

    const rawCondition = this.assertExists(
      this.generateExpression(node.condition, localVariablesMap),
      'generateForLoop -- rawCondition'
    )

    const condition = this.convertConditionToBoolean(rawCondition)

    this.Builder.CreateCondBr(condition, loopBodyBB, loopEndBB)

    this.Builder.SetInsertPoint(loopBodyBB)

    this.loopEndBlocks.push(loopEndBB)
    this.loopContinueBlocks.push(loopIterBB)

    this.generateFunctionBody(node.body, localVariablesMap)

    this.loopEndBlocks.pop()
    this.loopContinueBlocks.pop()

    /* this would indicate a bug earlier */
    /* istanbul ignore else */
    if (!this.Builder.GetInsertBlock()?.getTerminator()) {
      this.Builder.CreateBr(loopIterBB)
    }

    this.Builder.SetInsertPoint(loopIterBB)
    this.generateAssignment(node.iterator, localVariablesMap)
    this.Builder.CreateBr(loopCondBB)

    this.Builder.SetInsertPoint(loopEndBB)
  }

  private generatePrint(
    node: FunctionCallNode,
    localVariablesMap: Map<string, llvm.Value>
  ) {
    // TODO: allow for more than one argument in print
    /* istanbul ignore next */
    if (node.args.length !== 1) {
      Logger.logErrors([
        new GeneratorError(
          `print() expects exactly 1 argument, got ${node.args.length}`
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    const value = this.assertExists(
      this.generateExpression(node.args[0], localVariablesMap),
      'generateFunctionCall -- print value'
    )

    const int8PtrType = llvm.Type.getInt8PtrTy(this.Context)
    const formatStringPtr = this.Builder.CreateBitCast(
      this.printFormatString!,
      int8PtrType,
      'format_string_ptr'
    )

    return this.Builder.CreateCall(
      this.printfFunction!,
      [formatStringPtr, value],
      'print_call'
    )
  }

  private generateExpression(
    node: ExpressionNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value {
    /* istanbul ignore else */
    if (node.variant instanceof TerminatorNode) {
      /* istanbul ignore else */
      if (node.variant.variant instanceof IntegerLiteralNode) {
        return this.generateIntegerLiteral(node.variant.variant)
      } else if (node.variant.variant instanceof IdentifierNode) {
        return this.generateIdentifier(node.variant.variant, localVariablesMap)
      } else if (node.variant.variant instanceof FunctionCallNode) {
        return this.generateFunctionCall(
          node.variant.variant,
          localVariablesMap
        )
      }
      /* istanbul ignore else */
    } else if (node.variant instanceof BinaryExpressionNode) {
      return this.generateBinaryExpression(node.variant, localVariablesMap)
    }

    // We should never get here unless we have a bug
    /* istanbul ignore next */
    Logger.logErrors([
      new GeneratorError(`Unsupported expression type: ${node.variant}`),
    ])
    /* istanbul ignore next */
    ErrorHandler.exitOrThrow(1)
  }

  private generateBinaryExpression(
    node: BinaryExpressionNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value {
    const left = this.assertExists(
      this.generateExpression(node.left, localVariablesMap),
      'generateBinaryExpression'
    )
    const right = this.assertExists(
      this.generateExpression(node.right, localVariablesMap),
      'generateBinaryExpression'
    )

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
      /* if we hit this, there would have to be a bug earlier in the parser or tokenizer */
      /* istanbul ignore next */
      default:
        Logger.logErrors([
          new GeneratorError(
            `Unsupported operator: ${node.operator.tokenType}`
          ),
        ])
        ErrorHandler.exitOrThrow(1)
    }
  }

  private generateAssignment(
    node: AssignmentNode,
    localVariablesMap: Map<string, llvm.Value>
  ): void {
    const varName = this.assertExists(
      node.identifier.token.value,
      'generateAssignment -- varName'
    )

    const variable: llvm.Value = this.assertExists(
      localVariablesMap.get(varName) ?? this.GlobalVariablesMap.get(varName),
      'generateAssignment'
    )

    const value = this.generateExpression(node.expression, localVariablesMap)

    /* if we hit this, there would have to be a bug earlier in the parser or tokenizer */
    /* istanbul ignore next */
    if (!value) {
      Logger.logErrors([
        new GeneratorError('No value for assignment expression'),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    this.Builder.CreateStore(value, variable)
  }

  private generateVariableDefinition(
    node: VariableDefinitionNode,
    variablesMap: Map<string, llvm.Value>,
    /* istanbul ignore next */
    isGlobal: boolean = false
  ): void {
    const varName = this.assertExists(
      node.token.value,
      'generateVariableDefinition'
    )

    // this is caught earlier in the parser
    /* istanbul ignore next */
    if (RESERVED_NAMES.includes(varName)) {
      Logger.logErrors([
        new GeneratorError(
          `'${varName}' is a reserved name and cannot be used as a variable name`
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    if (variablesMap.has(varName)) {
      Logger.logErrors([
        new GeneratorError(`Variable ${varName} already defined`),
      ])

      ErrorHandler.exitOrThrow(1)
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

    this.Builder.CreateStore(expressionValue, variable)
  }

  private generateReturn(
    node: ReturnNode,
    localVariablesMap: Map<string, llvm.Value>
  ): llvm.Value {
    const expressionValue = this.assertExists(
      this.generateExpression(node.expression, localVariablesMap),
      'generateReturn'
    )

    return this.Builder.CreateRet(expressionValue)
  }

  // I don't think I ever understood what I was doing here
  private generateIfStatement(
    node: IfStatementNode,
    variablesMap: Map<string, llvm.Value>,
    mergeBlock?: llvm.BasicBlock
  ): void {
    const rawCondition = this.assertExists(
      this.generateExpression(node.condition, variablesMap),
      'generateIfStatement -- rawCondition'
    )
    const condition = this.convertConditionToBoolean(rawCondition)

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

    if (!this.Builder.GetInsertBlock()?.getTerminator()) {
      this.Builder.CreateBr(endifBlock)
      branchedToEndif = true
    }

    if (node.elseStatements && node.elseStatements.length > 0) {
      this.Builder.SetInsertPoint(elseBlock)
      this.generateFunctionBody(node.elseStatements, variablesMap)

      // I'm _pretty_ sure this will never happen
      /* istanbul ignore next */
      if (!this.Builder.GetInsertBlock()?.getTerminator()) {
        this.Builder.CreateBr(endifBlock)
        branchedToEndif = true
      }
    } else if (node.elseIfStatement) {
      this.Builder.SetInsertPoint(elseBlock)
      this.generateIfStatement(node.elseIfStatement, variablesMap, endifBlock)

      const currentBlock = this.Builder.GetInsertBlock()

      // I'm _pretty_ sure this will never happen
      /* istanbul ignore next */
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

  private generateBreakStatement(): void {
    const loopEndBB = this.loopEndBlocks[this.loopEndBlocks.length - 1]

    // this is caught earlier in the parser
    /* istanbul ignore next */
    if (!loopEndBB) {
      Logger.logErrors([
        new GeneratorError('Break statement must be inside a loop'),
      ])
      ErrorHandler.exitOrThrow(1)
    }
    this.Builder.CreateBr(loopEndBB)
  }

  private generateContinueStatement(): void {
    const loopContinueBB =
      this.loopContinueBlocks[this.loopContinueBlocks.length - 1]

    // this is caught earlier in the parser
    /* istanbul ignore next */
    if (!loopContinueBB) {
      Logger.logErrors([
        new GeneratorError('Continue statement must be inside a loop'),
      ])
      ErrorHandler.exitOrThrow(1)
    }
    this.Builder.CreateBr(loopContinueBB)
  }

  private generateFunctionBody(
    body: StatementNode[],
    variablesMap: Map<string, llvm.Value>
  ): void {
    // actually lame that you can't
    // switch(statement.variant) {
    //   case instanceof ReturnNode:
    // }
    for (const statement of body) {
      /* istanbul ignore else */
      if (statement instanceof StatementNode) {
        /* istanbul ignore else */
        if (statement.variant instanceof VariableDefinitionNode) {
          this.generateVariableDefinition(
            statement.variant,
            variablesMap,
            false
          )
        } else if (statement.variant instanceof ReturnNode) {
          this.generateReturn(statement.variant, variablesMap)
        } else if (statement.variant instanceof ExpresssionStatementNode) {
          this.generateExpression(statement.variant.expression, variablesMap)
        } else if (statement.variant instanceof IfStatementNode) {
          this.generateIfStatement(statement.variant, variablesMap)
        } else if (statement.variant instanceof ForLoopNode) {
          this.generateForLoop(statement.variant, variablesMap)
        } else if (statement.variant instanceof WhileLoopNode) {
          this.generateWhileLoop(statement.variant, variablesMap)
        } else if (statement.variant instanceof AssignmentNode) {
          this.generateAssignment(statement.variant, variablesMap)
        } else if (statement.variant instanceof BreakStatementNode) {
          this.generateBreakStatement()
        } else if (statement.variant instanceof ContinueStatementNode) {
          this.generateContinueStatement()
        }
      }
    }
  }

  // TODO?: Require a return statement in the main function
  // TODO: Require a return from all functions unless void
  private generateFunction(node: FunctionNode): void {
    const variablesMap = new Map<string, llvm.Value>()

    const functionName = node.proto.name

    // this is caught earlier in the parser
    /* istanbul ignore next */
    if (RESERVED_NAMES.includes(functionName)) {
      Logger.logErrors([
        new GeneratorError(
          `'${functionName}' is a reserved name and cannot be used as a function name`
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    const int32Type = llvm.Type.getInt32Ty(this.Context)

    // TODO: implement types
    const paramTypes: llvm.Type[] = node.proto.args.map(() => int32Type)

    const functionType = llvm.FunctionType.get(int32Type, paramTypes, false)
    const _function = llvm.Function.Create(
      functionType,
      llvm.Function.LinkageTypes.ExternalLinkage,
      functionName,
      this.Module
    )
    const entryBlock = llvm.BasicBlock.Create(this.Context, 'entry', _function)
    this.Builder.SetInsertPoint(entryBlock)

    let paramIndex = 0
    for (const paramName of node.proto.args) {
      const param = _function.getArg(paramIndex)
      param.setName(paramName)

      const alloca = this.Builder.CreateAlloca(int32Type, null, paramName)
      this.Builder.CreateStore(param, alloca)
      variablesMap.set(paramName, alloca)

      paramIndex++
    }

    this.generateFunctionBody(node.body, variablesMap)
  }

  public generateProgram(program: ProgramNode): string {
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
      this.generateVariableDefinition(
        globalVariableDefinition,
        this.GlobalVariablesMap,
        true // isGlobal
      )
    }

    for (const functionDefinition of program.functions) {
      this.generateFunction(functionDefinition)
    }

    if (!program.mainFunction) {
      Logger.logErrors([new GeneratorError('Main function not found')])
      ErrorHandler.exitOrThrow(1)
    }

    const mainEntryBlock = this.Function!.getEntryBlock()
    this.Builder.SetInsertPoint(mainEntryBlock)

    const mainVariablesMap = new Map<string, llvm.Value>()
    this.generateFunctionBody(program.mainFunction.body, mainVariablesMap)

    return this.Module.print()
  }
}
