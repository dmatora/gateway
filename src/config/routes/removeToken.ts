import { FastifyPluginAsync } from 'fastify';

import {
  RemoveDefaultTokenRequest,
  DefaultTokenResponse,
  RemoveDefaultTokenRequestSchema,
  DefaultTokenResponseSchema,
} from '../schemas';
import { removeDefaultToken } from '../utils';

export const removeTokenRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: RemoveDefaultTokenRequest;
    Reply: DefaultTokenResponse;
  }>(
    '/tokens/remove',
    {
      schema: {
        description:
          'Remove a custom token from a specific chain and network token list. This currently only supports Ethereum-based chains.',
        tags: ['system'],
        body: RemoveDefaultTokenRequestSchema,
        response: {
          200: DefaultTokenResponseSchema,
        },
      },
    },
    async (request) => {
      const { chain, network, token } = request.body;
      await removeDefaultToken(fastify, chain, network, token);
      return { message: `Token ${token} removed from ${chain}/${network}` };
    },
  );
};

export default removeTokenRoute;
