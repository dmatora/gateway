import { Type, Static } from '@sinclair/typebox';

// Configuration update schema
export const ConfigUpdateRequestSchema = Type.Object({
  configPath: Type.String({ description: 'Configuration path' }),
  configValue: Type.Union(
    [
      Type.String(),
      Type.Number(),
      Type.Boolean(),
      Type.Object({}),
      Type.Array(Type.Any()),
    ],
    { description: 'Configuration value' },
  ),
});

export const ConfigUpdateResponseSchema = Type.Object({
  message: Type.String({ description: 'Status message' }),
});

// TypeScript types for config update
export type ConfigUpdateRequest = Static<typeof ConfigUpdateRequestSchema>;
export type ConfigUpdateResponse = Static<typeof ConfigUpdateResponseSchema>;

// Default pools schemas
export const DefaultPoolRequestSchema = Type.Object({
  connector: Type.String({
    description:
      'Connector name in format "connector/type" (e.g., raydium/amm, raydium/clmm, uniswap/amm, uniswap/clmm, meteora/clmm)',
    examples: [
      'raydium/amm',
      'raydium/clmm',
      'uniswap/amm',
      'uniswap/clmm',
      'meteora/clmm',
    ],
  }),
  baseToken: Type.String({
    description: 'Base token symbol',
    examples: ['SOL', 'USDC', 'ETH', 'WETH'],
  }),
  quoteToken: Type.String({
    description: 'Quote token symbol',
    examples: ['USDC', 'USDT', 'DAI', 'WETH'],
  }),
  poolAddress: Type.Optional(
    Type.String({
      description: 'Pool address (required for adding, optional for removal)',
      examples: [
        '3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv', // Solana example (raydium/meteora)
        '0xd0b53d9277642d899df5c87a3966a349a798f224', // Ethereum example (uniswap)
      ],
    }),
  ),
});

export const DefaultPoolResponseSchema = Type.Object({
  message: Type.String({ description: 'Status message' }),
});

export type DefaultPoolRequest = Static<typeof DefaultPoolRequestSchema>;
export type DefaultPoolResponse = Static<typeof DefaultPoolResponseSchema>;

// Default tokens schemas
export const DefaultTokenRequestSchema = Type.Object({
  chain: Type.String({
    description:
      "The blockchain chain name. For EVM-compatible chains, this is typically 'ethereum'. The `network` field is used to specify the exact chain.",
    examples: ['ethereum'],
  }),
  network: Type.String({
    description:
      'The network name to add the token to (e.g., mainnet, arbitrum, base, polygon).',
    examples: ['mainnet', 'base', 'arbitrum', 'polygon'],
  }),
  name: Type.String({
    description: 'The token symbol',
    examples: ['Tsunami'],
  }),
  symbol: Type.String({
    description: 'The token symbol',
    examples: ['NAMI'],
  }),
  address: Type.String({
    description: 'The token contract address',
    examples: ['0x7EB4DB4dDDB16A329c5aDE17a8a0178331267E28'],
  }),
  decimals: Type.Number({
    description: 'The number of decimals for the token',
    examples: [18],
  }),
});

export const DefaultTokenResponseSchema = Type.Object({
  message: Type.String({ description: 'Status message' }),
});

export const RemoveDefaultTokenRequestSchema = Type.Object({
  chain: Type.String({
    description:
      "The blockchain chain name. For EVM-compatible chains, this is typically 'ethereum'. The `network` field is used for lookup.",
    examples: ['ethereum'],
  }),
  network: Type.String({
    description:
      'The network name to remove the token from (e.g., mainnet, base, arbitrum).',
    examples: ['mainnet', 'base', 'arbitrum'],
  }),
  token: Type.String({
    description: 'The token symbol or address to remove',
    examples: ['NAMI', '0x7EB4DB4dDDB16A329c5aDE17a8a0178331267E28'],
  }),
});

export type DefaultTokenRequest = Static<typeof DefaultTokenRequestSchema>;
export type DefaultTokenResponse = Static<typeof DefaultTokenResponseSchema>;
export type RemoveDefaultTokenRequest = Static<
  typeof RemoveDefaultTokenRequestSchema
>;

// Default pool list schema
export const DefaultPoolListSchema = Type.Record(
  Type.String({
    pattern: '^[A-Z]+-[A-Z]+$',
  }),
  Type.String(),
);

export type DefaultPoolListResponse = Static<typeof DefaultPoolListSchema>;

// Config query schema
export const ConfigQuerySchema = Type.Object({
  chainOrConnector: Type.Optional(
    Type.String({
      description:
        'Optional chain or connector name (e.g., "solana", "ethereum", "uniswap")',
      examples: ['solana'],
    }),
  ),
});

export type ConfigQuery = Static<typeof ConfigQuerySchema>;

// Pools query schema
export const PoolsQuerySchema = Type.Object({
  connector: Type.String({
    description:
      'Connector name in format "connector/type" (e.g., raydium/amm, raydium/clmm, uniswap/amm, uniswap/clmm, meteora/clmm)',
    examples: [
      'raydium/amm',
      'raydium/clmm',
      'uniswap/amm',
      'uniswap/clmm',
      'meteora/clmm',
    ],
  }),
});

export type PoolsQuery = Static<typeof PoolsQuerySchema>;
