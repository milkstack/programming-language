import { Logger } from './utils/Logger'
import { OPERATORS_MAP } from './constants/Operators'
import { RESERVED_NAMES } from './constants/ReservedNames'
import { ParseError } from './models/ParseError'
import { Token } from './models/Token'
import { TokenType } from './models/TokenType'
import { AssignmentNode } from './models/nodes/AssignmentNode'
import { BinaryExpressionNode } from './models/nodes/BinaryExpressionNode'
import { ExpressionNode } from './models/nodes/ExpressionNode'
import { ExpresssionStatementNode } from './models/nodes/ExpressionStatementNode'
import { ForLoopNode } from './models/nodes/ForLoopNode'
import { FunctionCallNode } from './models/nodes/FunctionCallNode'
import { FunctionNode } from './models/nodes/FunctionNode'
import { IdentifierNode } from './models/nodes/IdentifierNode'
import { IfStatementNode } from './models/nodes/IfStatementNode'
import { IntegerLiteralNode } from './models/nodes/IntegerLiteralNode'
import { ProgramNode } from './models/nodes/ProgramNode'
import { PrototypeNode } from './models/nodes/PrototypeNode'
import { ReturnNode } from './models/nodes/ReturnNode'
import { StatementNode } from './models/nodes/StatementNode'
import { TerminatorNode } from './models/nodes/TerminatorNode'
import { VariableDefinitionNode } from './models/nodes/VariableDefinitionNode'
import { WhileLoopNode } from './models/nodes/WhileLoopNode'
import { ErrorHandler } from './utils/ErrorHandler'
import { BreakStatementNode } from './models/nodes/BreakStatementNode'
import { ContinueStatementNode } from './models/nodes/ContinueStatementNode'

export class Parser {
  private tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private validateIdentifierNotReserved(
    identifierToken: Token,
    context: string
  ): void {
    if (
      identifierToken.value &&
      RESERVED_NAMES.includes(identifierToken.value)
    ) {
      Logger.logErrors([
        new ParseError(
          `'${identifierToken.value}' is a reserved name and cannot be used as a ${context}`,
          identifierToken.lineNumber
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }
  }

  private checkIsOperator(token: Token | undefined): boolean {
    if (!token || !OPERATORS_MAP.has(token.tokenType)) {
      return false
    }
    return true
  }

  private peek(i?: number): Token | undefined {
    if (!i) {
      return this.tokens[0]
    }
    return this.tokens[i]
  }

  private consume = (requiredType?: TokenType): Token => {
    const token = this.peekOrExit(requiredType)

    this.tokens.shift()

    return token
  }

  private peekOrExit = (requiredType?: TokenType, i?: number): Token => {
    const token = this.peek(i)

    if (!token) {
      Logger.logErrors([
        new ParseError(`Expected ${requiredType}, but got EOF`),
      ])

      ErrorHandler.exitOrThrow(1)
    }

    if (requiredType && requiredType !== token.tokenType) {
      Logger.logErrors([
        new ParseError(
          `Expected ${requiredType}, but got ${token?.tokenType}`,
          token?.lineNumber
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    return token
  }

  private parseAtom(): ExpressionNode {
    const token = this.peekOrExit()

    if (token.tokenType === TokenType.LeftParen) {
      this.consume(TokenType.LeftParen)
      const expression = this.parseExpression(0)

      this.consume(TokenType.RightParen)

      return expression
    }

    if (token.tokenType === TokenType.IntegerLiteral) {
      this.consume(TokenType.IntegerLiteral)
      return new ExpressionNode(
        new TerminatorNode(new IntegerLiteralNode(token))
      )
    }

    // last option. Exit here if we don't find an identifier
    const identifierToken = this.peekOrExit(TokenType.Identifier)
    if (this.peek(1)?.tokenType !== TokenType.LeftParen) {
      this.consume(TokenType.Identifier)
      return new ExpressionNode(
        new TerminatorNode(new IdentifierNode(identifierToken))
      )
    }

    const functionCallNode = this.parseFunctionCall()

    return new ExpressionNode(new TerminatorNode(functionCallNode))
  }

  private parseAssignment(): AssignmentNode {
    const identifier = this.consume(TokenType.Identifier)

    this.consume(TokenType.Assign)

    const expression = this.parseExpression()

    return new AssignmentNode(new IdentifierNode(identifier), expression)
  }

  private parseForLoop(): ForLoopNode {
    this.consume(TokenType.For)
    this.consume(TokenType.LeftParen)

    const variableDefinitionNode = this.parseVariableDeclaration(true)

    this.consume(TokenType.Semicolon)

    const condition = this.parseExpression()

    this.consume(TokenType.Semicolon)

    const iterator = this.parseAssignment()

    this.consume(TokenType.RightParen)

    const body = this.parseBody(true)

    return new ForLoopNode(variableDefinitionNode, condition, iterator, body)
  }

  private parseExpression(minPrecedence: number = 0): ExpressionNode {
    let atomLHS = this.parseAtom()
    let possibleOperator: Token | undefined = undefined
    let atomRHS: ExpressionNode | undefined = undefined

    while (true) {
      possibleOperator = this.peek()
      if (
        !possibleOperator ||
        !this.checkIsOperator(possibleOperator) ||
        OPERATORS_MAP.get(possibleOperator.tokenType)!.precedence <
          minPrecedence
      ) {
        break
      }

      const { precedence, associativity } = OPERATORS_MAP.get(
        possibleOperator.tokenType
      )!

      /* TODO: implement right associative operators like exponentiation */
      /* istanbul ignore next */
      const nextMinPrecedence = precedence + (associativity === 'left' ? 1 : 0)

      this.consume()
      atomRHS = this.parseExpression(nextMinPrecedence)

      atomLHS = new ExpressionNode(
        new BinaryExpressionNode(atomLHS, possibleOperator, atomRHS)
      )
    }

    return atomLHS
  }

  private parseFunctionDeclarationArgs(): string[] {
    const args: string[] = []

    while (this.peek() && this.peek()!.tokenType === TokenType.Identifier) {
      const argToken = this.consume(TokenType.Identifier)
      this.validateIdentifierNotReserved(argToken, 'function parameter name')
      args.push(argToken.value!)

      if (this.peekOrExit().tokenType === TokenType.Comma) {
        this.consume()
      } else {
        break
      }
    }
    return args
  }

  private parseBody(inLoop: boolean = false): StatementNode[] {
    this.consume(TokenType.LeftCurly)

    const statements: StatementNode[] = []

    while (this.peek() && this.peek()!.tokenType !== TokenType.RightCurly) {
      const statementNode = this.parseStatement(inLoop)
      statements.push(statementNode)
    }

    this.consume(TokenType.RightCurly)

    return statements
  }

  private parseFunctionPrototype(): PrototypeNode {
    const nameToken = this.consume(TokenType.Identifier)
    this.validateIdentifierNotReserved(nameToken, 'function name')

    this.consume(TokenType.LeftParen)

    const args = this.parseFunctionDeclarationArgs()

    this.consume(TokenType.RightParen)

    return new PrototypeNode(nameToken.value!, args)
  }

  private parseFunctionDefinition(): FunctionNode {
    this.consume(TokenType.Function)

    const prototype = this.parseFunctionPrototype()

    const body = this.parseBody()

    return new FunctionNode(prototype, body)
  }

  private parseReturn(): ReturnNode {
    this.consume(TokenType.Return)

    const expression = this.parseExpression()

    return new ReturnNode(expression)
  }

  private parseVariableDeclaration(
    allowNoLet: boolean = false
  ): VariableDefinitionNode {
    if (!allowNoLet) this.consume(TokenType.Let)

    const identifierToken = this.consume(TokenType.Identifier)
    this.validateIdentifierNotReserved(identifierToken, 'variable name')

    this.consume(TokenType.Assign)

    const expression = this.parseExpression()

    return new VariableDefinitionNode(identifierToken, expression)
  }

  private parseIfStatement(inLoop: boolean): IfStatementNode {
    this.consume(TokenType.If)

    const condition = this.parseExpression()

    const thenStatements = this.parseBody(inLoop)

    let elseIfStatement: IfStatementNode | undefined
    let elseStatements: StatementNode[] = []

    if (this.peek()?.tokenType === TokenType.Else) {
      this.consume(TokenType.Else)

      if (this.peek()?.tokenType === TokenType.If) {
        elseIfStatement = this.parseIfStatement(inLoop)
      } else {
        elseStatements = this.parseBody(inLoop)
      }
    }

    return new IfStatementNode(
      condition,
      thenStatements,
      elseIfStatement,
      elseStatements
    )
  }

  private parseFunctionCallArgs(): ExpressionNode[] {
    const args: ExpressionNode[] = []

    while (this.peek() && this.peek()!.tokenType !== TokenType.RightParen) {
      const expression = this.parseExpression()

      args.push(expression)

      const nextToken = this.peekOrExit()

      if (nextToken.tokenType === TokenType.Comma) {
        this.consume(TokenType.Comma)
      } else if (nextToken.tokenType === TokenType.RightParen) {
        return args
      } else {
        Logger.logErrors([
          new ParseError(
            `Expected comma or right parenthesis, but got ${nextToken.tokenType}`,
            nextToken.lineNumber
          ),
        ])

        ErrorHandler.exitOrThrow(1)
      }
    }
    return args
  }

  private parseFunctionCall(): FunctionCallNode {
    const identifierToken = this.consume(TokenType.Identifier)

    this.consume(TokenType.LeftParen)

    const args = this.parseFunctionCallArgs()

    this.consume(TokenType.RightParen)

    return new FunctionCallNode(identifierToken, args)
  }

  private parseWhileLoop(): WhileLoopNode {
    this.consume(TokenType.While)
    this.consume(TokenType.LeftParen)

    const condition = this.parseExpression()

    this.consume(TokenType.RightParen)

    const body = this.parseBody(true)

    return new WhileLoopNode(condition, body)
  }

  private parseStatement(inLoop: boolean): StatementNode {
    const token = this.peekOrExit()

    if (token.tokenType === TokenType.If) {
      return new StatementNode(this.parseIfStatement(inLoop))
    }

    if (token.tokenType === TokenType.Return) {
      const returnNode = this.parseReturn()
      this.consume(TokenType.Semicolon)
      return new StatementNode(returnNode)
    }

    if (token.tokenType === TokenType.Let) {
      const variableDefinitionNode = this.parseVariableDeclaration()
      this.consume(TokenType.Semicolon)
      return new StatementNode(variableDefinitionNode)
    }

    if (token.tokenType === TokenType.For) {
      return new StatementNode(this.parseForLoop())
    }

    if (token.tokenType === TokenType.While) {
      return new StatementNode(this.parseWhileLoop())
    }

    if (
      !inLoop &&
      (token.tokenType === TokenType.Break ||
        token.tokenType === TokenType.Continue)
    ) {
      Logger.logErrors([
        new ParseError(
          '"break" and "continue" statements can only be used inside a loop',
          token.lineNumber
        ),
      ])
      ErrorHandler.exitOrThrow(1)
    }

    if (token.tokenType === TokenType.Break) {
      this.consume(TokenType.Break)
      this.consume(TokenType.Semicolon)
      return new StatementNode(new BreakStatementNode())
    }

    if (token.tokenType === TokenType.Continue) {
      this.consume(TokenType.Continue)
      this.consume(TokenType.Semicolon)
      return new StatementNode(new ContinueStatementNode())
    }

    // last option. Exit here if we don't find an identifier
    this.peekOrExit(TokenType.Identifier)

    if (this.peek(1) && this.peek(1)!.tokenType === TokenType.Assign) {
      const assignment = this.parseAssignment()
      this.consume(TokenType.Semicolon)

      return new StatementNode(assignment)
    }

    const expression = this.parseExpression()
    this.consume(TokenType.Semicolon)
    return new StatementNode(new ExpresssionStatementNode(expression))
  }

  public parseProgram(): ProgramNode {
    const programNode = new ProgramNode([], [], undefined)

    while (this.peek()) {
      const token = this.peekOrExit()
      if (token.tokenType === TokenType.Function) {
        const identifierToken = this.peekOrExit(TokenType.Identifier, 1)

        if (
          identifierToken.tokenType === TokenType.Identifier &&
          identifierToken.value === 'main'
        ) {
          const functionNode = this.parseFunctionDefinition()
          programNode.mainFunction = functionNode
          continue
        }

        const functionNode = this.parseFunctionDefinition()
        programNode.functions.push(functionNode)
        continue
      }

      if (token.tokenType === TokenType.Let) {
        const variableDefinitionNode = this.parseVariableDeclaration()

        programNode.globalVariables.push(variableDefinitionNode)

        this.consume(TokenType.Semicolon)

        continue
      }

      Logger.logErrors([
        new ParseError(
          `Unexpected token ${token.tokenType} at program level`,
          token.lineNumber
        ),
      ])

      ErrorHandler.exitOrThrow(1)
    }

    return programNode
  }
}
