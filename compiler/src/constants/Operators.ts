import { TokenType } from '../models/TokenType'

export const OPERATORS_MAP = new Map<
  TokenType,
  { precedence: number; associativity: 'left' | 'right' }
>([
  [
    TokenType.Equal,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],
  [
    TokenType.NotEqual,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],
  [
    TokenType.LessThan,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],
  [
    TokenType.GreaterThan,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],
  [
    TokenType.LessThanEqual,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],
  [
    TokenType.GreaterThanEqual,
    {
      precedence: 0,
      associativity: 'left',
    },
  ],

  [
    TokenType.Plus,
    {
      precedence: 1,
      associativity: 'left',
    },
  ],
  [
    TokenType.Minus,
    {
      precedence: 1,
      associativity: 'left',
    },
  ],
  [
    TokenType.Star,
    {
      precedence: 2,
      associativity: 'left',
    },
  ],
  [
    TokenType.Slash,
    {
      precedence: 2,
      associativity: 'left',
    },
  ],
])
