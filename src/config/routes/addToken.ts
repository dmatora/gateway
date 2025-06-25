import { FastifyPluginAsync } from 'fastify';

import {
  DefaultTokenRequest,
  DefaultTokenResponse,
  DefaultTokenRequestSchema,
  DefaultTokenResponseSchema,
} from '../schemas';
import { addDefaultToken } from '../utils';

export const addTokenRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DefaultTokenRequest; Reply: DefaultTokenResponse }>(
    '/tokens/add',
    {
      schema: {
        description:
          'Add a custom token to a specific chain and network token list. This is useful for tokens not present in the default lists. This currently only supports Ethereum-based chains.',
        tags: ['system'],
        body: DefaultTokenRequestSchema,
        response: {
          200: DefaultTokenResponseSchema,
        },
      },
    },
    async (request) => {
      const { chain, network, name, symbol, address, decimals } = request.body;
      await addDefaultToken(fastify, chain, network, name, symbol, address, decimals);
      return { message: `Token ${symbol} added to ${chain}/${network}` };
    },
  );
};

export default addTokenRoute;
