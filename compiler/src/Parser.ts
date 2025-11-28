import { OPERATORS_MAP } from './constants/Operators'
import { ParseError } from './models/ParseError'
import { Token } from './models/Token'
import { TokenType } from './models/TokenType'
import { BinaryExpressionNode } from './models/nodes/BinaryExpressionNode'
import { ExpressionNode } from './models/nodes/ExpressionNode'
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

// TODO: add a tryConsume method that will consume a token if it is of the expected type
// and error out if it is not
// make error pretty printing more global

export class Parser {
  private tokens: Token[]
  public error: ParseError | undefined = undefined

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private assertType(token: Token | undefined, type: TokenType): boolean {
    if (!token || token.tokenType !== type) {
      if (!this.error) {
        this.error = new ParseError(
          `Expected ${type}, but got ${token?.tokenType ?? 'undefined'}`,
          token?.lineNumber ?? 0
        )
      }
      return false
    }
    return true
  }

  private assertDefined<T>(value: T | undefined, message: string): boolean {
    if (!value) {
      if (!this.error) {
        this.error = new ParseError(
          `Expected ${message}, but got undefined`,
          this.peek()?.lineNumber ?? 0
        )
      }
      return false
    }
    return true
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

  private consumeToken(): Token | undefined {
    if (this.peek()) {
      return this.tokens.shift()
    }
    return undefined
  }

  private parseAtom(): ExpressionNode | undefined {
    const token = this.consumeToken()!
    if (!this.assertDefined(token, 'token')) {
      return undefined
    }

    if (token.tokenType === TokenType.LeftParen) {
      const expression = this.parseExpression(0)!
      if (!this.assertDefined(expression, 'expression')) {
        return undefined
      }

      const rightParenToken = this.consumeToken()!
      if (!this.assertType(rightParenToken, TokenType.RightParen)) {
        return undefined
      }

      return expression
    }

    if (token.tokenType === TokenType.IntegerLiteral) {
      return new ExpressionNode(
        new TerminatorNode(new IntegerLiteralNode(token))
      )
    }

    if (token.tokenType === TokenType.Identifier) {
      return new ExpressionNode(new TerminatorNode(new IdentifierNode(token)))
    }

    return undefined
  }

  private parseExpression(
    minPrecedence: number = 0
  ): ExpressionNode | undefined {
    let atomLHS = this.parseAtom()!
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

      const nextMinPrecedence = precedence + (associativity === 'left' ? 1 : 0)

      this.consumeToken()
      atomRHS = this.parseExpression(nextMinPrecedence)

      if (!this.assertDefined(atomRHS, 'right-hand side expression')) {
        return undefined
      }

      atomLHS = new ExpressionNode(
        new BinaryExpressionNode(atomLHS, possibleOperator, atomRHS!)
      )
    }

    return atomLHS
  }

  private parseFunctionArgs(): string[] | undefined {
    const args: string[] = []

    while (this.peek() && this.peek()!.tokenType === TokenType.Identifier) {
      const argToken = this.consumeToken()!
      if (!this.assertType(argToken, TokenType.Identifier)) {
        return undefined
      }
      args.push(argToken.value!)

      if (this.peek() && this.peek()!.tokenType === TokenType.Comma) {
        this.consumeToken()
      } else {
        break
      }
    }
    return args
  }

  private parseBody(): (StatementNode | IfStatementNode)[] | undefined {
    const leftCurlyToken = this.consumeToken()
    if (!this.assertType(leftCurlyToken, TokenType.LeftCurly)) {
      return undefined
    }

    const statements: (StatementNode | IfStatementNode)[] = []
    while (this.peek() && this.peek()!.tokenType !== TokenType.RightCurly) {
      if (this.peek()?.tokenType === TokenType.If) {
        const ifStatementNode = this.parseIfStatement()
        if (!this.assertDefined(ifStatementNode, 'if statement')) {
          return undefined
        }
        statements.push(ifStatementNode!)
        continue
      }

      const statementNode = this.parseStatement()
      if (!this.assertDefined(statementNode, 'statement')) {
        return undefined
      }
      statements.push(statementNode!)
    }

    const rightCurlyToken = this.consumeToken()
    if (!this.assertType(rightCurlyToken, TokenType.RightCurly)) {
      return undefined
    }

    return statements
  }

  private parseFunctionPrototype(): PrototypeNode | undefined {
    const nameToken = this.consumeToken()!
    if (!this.assertType(nameToken, TokenType.Identifier)) {
      return undefined
    }

    const leftParenToken = this.consumeToken()!
    if (!this.assertType(leftParenToken, TokenType.LeftParen)) {
      return undefined
    }

    const args = this.parseFunctionArgs()
    if (!this.assertDefined(args, 'function args')) {
      return undefined
    }

    const rightParenToken = this.consumeToken()!
    if (!this.assertType(rightParenToken, TokenType.RightParen)) {
      return undefined
    }

    return new PrototypeNode(nameToken.value!, args!)
  }

  private parseFunctionDefinition(): FunctionNode | undefined {
    this.consumeToken()!

    const prototype = this.parseFunctionPrototype()
    if (!this.assertDefined(prototype, 'function prototype')) {
      return undefined
    }

    const body = this.parseBody()
    if (!this.assertDefined(body, 'function body')) {
      return undefined
    }

    return new FunctionNode(prototype!, body!)
  }

  private parseReturn(): ReturnNode | undefined {
    this.consumeToken()

    const expression = this.parseExpression()!

    if (!this.assertDefined(expression, 'expression')) {
      return undefined
    }

    return new ReturnNode(expression)
  }

  private parseVariableDeclaration(): VariableDefinitionNode | undefined {
    this.consumeToken()

    const identifierToken = this.consumeToken()!
    if (!this.assertType(identifierToken, TokenType.Identifier)) {
      return undefined
    }

    const assignToken = this.consumeToken()
    if (!this.assertType(assignToken, TokenType.Assign)) {
      return undefined
    }

    const expression = this.parseExpression()!
    if (!this.assertDefined(expression, 'expression')) {
      return undefined
    }

    return new VariableDefinitionNode(identifierToken, expression)
  }

  private parseIfStatement(): IfStatementNode | undefined {
    this.consumeToken()

    const condition = this.parseExpression()!
    if (!this.assertDefined(condition, 'condition')) {
      return undefined
    }

    const thenStatements = this.parseBody()!
    if (!this.assertDefined(thenStatements?.[0], 'then statement')) {
      return undefined
    }

    let elseIfStatement: IfStatementNode | undefined
    let elseStatements: (StatementNode | IfStatementNode)[] = []

    if (this.peek()?.tokenType === TokenType.Else) {
      this.consumeToken()

      if (this.peek()?.tokenType === TokenType.If) {
        elseIfStatement = this.parseIfStatement()
      } else {
        elseStatements = this.parseBody()!
      }
    }

    return new IfStatementNode(
      condition,
      thenStatements,
      elseIfStatement,
      elseStatements
    )
  }

  private parseStatement(): StatementNode | IfStatementNode | undefined {
    const token = this.peek()!

    if (!this.assertDefined(token, 'statement')) {
      return undefined
    }

    let statementNode: StatementNode | IfStatementNode | undefined
    if (token.tokenType === TokenType.If) {
      const ifStatementNode = this.parseIfStatement()
      if (!this.assertDefined(ifStatementNode, 'if statement')) {
        return undefined
      }
      statementNode = ifStatementNode!
    }

    if (token.tokenType === TokenType.Return) {
      const returnNode = this.parseReturn()
      if (!this.assertDefined(returnNode, 'return')) {
        return undefined
      }

      statementNode = new StatementNode(returnNode!)
    }

    if (token.tokenType === TokenType.Let) {
      const variableDefinitionNode = this.parseVariableDeclaration()
      if (!this.assertDefined(variableDefinitionNode, 'variable declaration')) {
        return undefined
      }

      statementNode = new StatementNode(variableDefinitionNode!)
    }

    const semicolonToken = this.consumeToken()
    if (!this.assertType(semicolonToken, TokenType.Semicolon)) {
      return undefined
    }

    return statementNode
  }

  public parseProgram(): ProgramNode | undefined {
    const programNode = new ProgramNode([], [], undefined)

    while (this.peek()) {
      const token = this.peek()!
      if (token.tokenType === TokenType.Function) {
        const identifierToken = this.peek(1)!

        if (
          identifierToken.tokenType === TokenType.Identifier &&
          identifierToken.value === 'main'
        ) {
          const functionNode = this.parseFunctionDefinition()
          if (!this.assertDefined(functionNode, 'function definition')) {
            break
          }
          programNode.mainFunction = functionNode!
          break
        }

        const functionNode = this.parseFunctionDefinition()
        if (!this.assertDefined(functionNode, 'function definition')) {
          break
        }
        programNode.functions.push(functionNode!)
        continue
      }

      if (token.tokenType === TokenType.Let) {
        const variableDefinitionNode = this.parseVariableDeclaration()
        if (
          !this.assertDefined(variableDefinitionNode, 'variable declaration')
        ) {
          break
        }
        programNode.globalVariables.push(variableDefinitionNode!)

        const semicolonToken = this.consumeToken()
        if (!this.assertType(semicolonToken, TokenType.Semicolon)) {
          break
        }
        continue
      }

      if (!this.error) {
        this.error = new ParseError(
          `Unexpected token ${token.tokenType} at program level`,
          token.lineNumber
        )
      }
      break
    }

    return programNode
  }
}
