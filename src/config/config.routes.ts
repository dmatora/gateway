import { FastifyPluginAsync } from 'fastify';

import { addPoolRoute } from './routes/addPool';
import { addTokenRoute } from './routes/addToken';
import { getConfigRoute } from './routes/getConfig';
import { getPoolsRoute } from './routes/getPools';
import { removePoolRoute } from './routes/removePool';
import { removeTokenRoute } from './routes/removeToken';
import { updateConfigRoute } from './routes/updateConfig';

export const configRoutes: FastifyPluginAsync = async (fastify) => {
  // Register individual route handlers
  await fastify.register(getConfigRoute);
  await fastify.register(updateConfigRoute);
  await fastify.register(getPoolsRoute);
  await fastify.register(addPoolRoute);
  await fastify.register(removePoolRoute);
  await fastify.register(addTokenRoute);
  await fastify.register(removeTokenRoute);
};

export default configRoutes;
