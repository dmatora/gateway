import { FastifyInstance } from 'fastify';
import fse from 'fs-extra';

import { Ethereum, TokenInfo } from '../chains/ethereum/ethereum';
import { fromFractionString, toFractionString } from '../services/base';
import { ConfigManagerV2 } from '../services/config-manager-v2';
import { logger } from '../services/logger';
import { isFloatString, isFractionString } from '../services/string-utils';

import { ConfigUpdateRequest } from './schemas';

export const invalidAllowedSlippage: string =
  'allowedSlippage should be a number between 0.0 and 1.0 or a string of a fraction.';

// Only permit percentages 0.0 (inclusive) to less than 1.0
export const isAllowedPercentage = (val: string | number): boolean => {
  if (typeof val === 'string') {
    if (isFloatString(val)) {
      const num: number = parseFloat(val);
      return num >= 0.0 && num < 1.0;
    } else {
      const num: number | null = fromFractionString(val);
      return num !== null && num >= 0.0 && num < 1.0;
    }
  }
  return val >= 0.0 && val < 1.0;
};

export const validateAllowedSlippage = (
  fastify: FastifyInstance,
  configPath: string,
  configValue: any,
): void => {
  if (configPath.endsWith('allowedSlippage')) {
    if (
      !(
        (typeof configValue === 'number' ||
          (typeof configValue === 'string' &&
            (isFractionString(configValue) || isFloatString(configValue)))) &&
        isAllowedPercentage(configValue)
      )
    ) {
      throw fastify.httpErrors.badRequest(invalidAllowedSlippage);
    }
  }
};

// Mutates the input value in place to convert to fraction string format
export const updateAllowedSlippageToFraction = (
  body: ConfigUpdateRequest,
): void => {
  if (body.configPath.endsWith('allowedSlippage')) {
    if (
      typeof body.configValue === 'number' ||
      (typeof body.configValue === 'string' &&
        !isFractionString(body.configValue))
    ) {
      body.configValue = toFractionString(body.configValue);
    }
  }
};

export const getConfig = (
  _fastify: FastifyInstance, // Underscore to indicate unused parameter
  chainOrConnector?: string,
): object => {
  if (chainOrConnector) {
    logger.info(
      `Getting configuration for chain/connector: ${chainOrConnector}`,
    );
    const namespace =
      ConfigManagerV2.getInstance().getNamespace(chainOrConnector);
    return namespace ? namespace.configuration : {};
  }

  logger.info('Getting all configurations');
  return ConfigManagerV2.getInstance().allConfigurations;
};

export const updateConfig = (
  fastify: FastifyInstance,
  configPath: string,
  configValue: any,
): void => {
  logger.info(
    `Updating config path: ${configPath} with value: ${JSON.stringify(configValue)}`,
  );

  validateAllowedSlippage(fastify, configPath, configValue);

  try {
    ConfigManagerV2.getInstance().set(configPath, configValue);
    logger.info(`Successfully updated configuration: ${configPath}`);
  } catch (error) {
    logger.error(`Failed to update configuration: ${error.message}`);
    throw fastify.httpErrors.internalServerError(
      `Failed to update configuration: ${error.message}`,
    );
  }
};

export const addDefaultToken = async (
  fastify: FastifyInstance,
  chain: string,
  network: string,
  name: string,
  symbol: string,
  address: string,
  decimals: number,
): Promise<void> => {
  // All EVM-compatible networks are configured under the 'ethereum' namespace.
  const configChainName = 'ethereum';

  // Validate that the provided network is a configured EVM network.
  const availableNetworks = Object.keys(
    ConfigManagerV2.getInstance().get(`${configChainName}.networks`) || {},
  );
  if (!availableNetworks.includes(network)) {
    throw fastify.httpErrors.badRequest(
      `Network '${network}' is not a supported Ethereum-based network. Supported networks are: ${availableNetworks.join(', ')}`,
    );
  }

  // Get the token list file path from the config.
  const tokenListSourcePath = ConfigManagerV2.getInstance().get(
    `${configChainName}.networks.${network}.tokenListSource`,
  );

  if (!tokenListSourcePath) {
    throw fastify.httpErrors.internalServerError(
      `tokenListSource not configured for network '${network}'.`,
    );
  }

  try {
    // Read the existing token list
    let tokenList: TokenInfo[] = [];
    if (await fse.pathExists(tokenListSourcePath)) {
      const fileContent = await fse.readFile(tokenListSourcePath, 'utf8');
      tokenList = JSON.parse(fileContent);
    }

    // Check for duplicates (by address or symbol)
    const normalizedAddress = address.toLowerCase();
    const normalizedSymbol = symbol.toUpperCase();
    const existingToken = tokenList.find(
      (t) =>
        t.address.toLowerCase() === normalizedAddress ||
        t.symbol.toUpperCase() === normalizedSymbol,
    );

    if (existingToken) {
      throw fastify.httpErrors.conflict(
        `Token with address ${address} or symbol ${symbol} already exists.`,
      );
    }

    // Get the Ethereum instance for the specified network to retrieve the chainId.
    const ethereum = await Ethereum.getInstance(network);
    const chainId = ethereum.chainId;

    // Add the new token
    const newToken: TokenInfo = {
      chainId,
      address,
      name,
      symbol,
      decimals,
    };
    tokenList.push(newToken);

    // Write the updated list back to the file
    await fse.writeFile(
      tokenListSourcePath,
      JSON.stringify(tokenList, null, 2),
    );

    // Reload the tokens in the Ethereum instance to make it available immediately
    await ethereum.loadTokens(tokenListSourcePath, ethereum.tokenListType);

    logger.info(`Added token ${symbol} (${address}) to ${chain}/${network}.`);
  } catch (error) {
    logger.error(`Failed to add default token: ${error.message}`);
    if (error.statusCode) throw error;
    throw fastify.httpErrors.internalServerError(
      `Failed to add token: ${error.message}`,
    );
  }
};

export const removeDefaultToken = async (
  fastify: FastifyInstance,
  chain: string,
  network: string,
  tokenToRemove: string,
): Promise<void> => {
  // All EVM-compatible networks are configured under the 'ethereum' namespace.
  const configChainName = 'ethereum';

  // Validate that the provided network is a configured EVM network.
  const availableNetworks = Object.keys(
    ConfigManagerV2.getInstance().get(`${configChainName}.networks`) || {},
  );
  if (!availableNetworks.includes(network)) {
    throw fastify.httpErrors.badRequest(
      `Network '${network}' is not a supported Ethereum-based network. Supported networks are: ${availableNetworks.join(', ')}`,
    );
  }

  const tokenListSourcePath = ConfigManagerV2.getInstance().get(
    `${configChainName}.networks.${network}.tokenListSource`,
  );

  if (!tokenListSourcePath || !(await fse.pathExists(tokenListSourcePath))) {
    throw fastify.httpErrors.internalServerError(
      `tokenListSource not configured or found for network '${network}'.`,
    );
  }

  try {
    const fileContent = await fse.readFile(tokenListSourcePath, 'utf8');
    const tokenList: TokenInfo[] = JSON.parse(fileContent);

    const normalizedTokenToRemove = tokenToRemove.toLowerCase();
    const initialLength = tokenList.length;

    const updatedTokenList = tokenList.filter(
      (t) =>
        t.address.toLowerCase() !== normalizedTokenToRemove &&
        t.symbol.toLowerCase() !== normalizedTokenToRemove,
    );

    if (updatedTokenList.length === initialLength) {
      throw fastify.httpErrors.notFound(
        `Token ${tokenToRemove} not found in the list.`,
      );
    }

    // Write the updated list back
    await fse.writeFile(
      tokenListSourcePath,
      JSON.stringify(updatedTokenList, null, 2),
    );

    // Reload the tokens in the Ethereum instance
    const ethereum = await Ethereum.getInstance(network);
    await ethereum.loadTokens(tokenListSourcePath, ethereum.tokenListType);

    logger.info(`Removed token ${tokenToRemove} from ${chain}/${network}.`);
  } catch (error) {
    logger.error(`Failed to remove default token: ${error.message}`);
    if (error.statusCode) throw error;
    throw fastify.httpErrors.internalServerError(
      `Failed to remove token: ${error.message}`,
    );
  }
};

export const getDefaultPools = (
  fastify: FastifyInstance,
  connector: string,
): Record<string, string> => {
  // Parse connector name
  const [baseConnector, connectorType] = connector.split('/');

  if (!baseConnector) {
    throw fastify.httpErrors.badRequest('Connector name is required');
  }

  if (!connectorType) {
    throw fastify.httpErrors.badRequest(
      'Connector type is required (e.g., amm, clmm)',
    );
  }

  try {
    // Get connector config
    const connectorConfig =
      ConfigManagerV2.getInstance().getNamespace(baseConnector)?.configuration;

    if (!connectorConfig || !connectorConfig.networks) {
      logger.error(
        `Connector ${baseConnector} configuration not found or missing networks`,
      );
      return {};
    }

    // Get active network
    const activeNetworks = Object.keys(connectorConfig.networks);
    if (activeNetworks.length === 0) {
      return {};
    }

    // Use mainnet-beta for Solana, mainnet for Ethereum by default, or first available network
    let activeNetwork = 'mainnet-beta';
    if (!connectorConfig.networks[activeNetwork]) {
      activeNetwork = activeNetworks[0];
    }

    // Get pools for the specific connector type
    const pools = connectorConfig.networks[activeNetwork][connectorType] || {};

    logger.info(
      `Retrieved default pools for ${connector} on network ${activeNetwork}`,
    );
    return pools;
  } catch (error) {
    logger.error(`Failed to get default pools for ${connector}: ${error}`);
    throw fastify.httpErrors.internalServerError('Failed to get default pools');
  }
};

export const addDefaultPool = (
  fastify: FastifyInstance,
  connector: string,
  baseToken: string,
  quoteToken: string,
  poolAddress?: string,
): void => {
  const pairKey = `${baseToken}-${quoteToken}`;

  if (!poolAddress) {
    throw fastify.httpErrors.badRequest(
      'Pool address is required for adding a default pool',
    );
  }

  const [baseConnector, connectorType] = connector.split('/');

  if (!baseConnector) {
    throw fastify.httpErrors.badRequest('Connector name is required');
  }

  if (!connectorType) {
    throw fastify.httpErrors.badRequest(
      'Connector type is required (e.g., amm, clmm)',
    );
  }

  try {
    // Get connector config
    const connectorConfig =
      ConfigManagerV2.getInstance().getNamespace(baseConnector)?.configuration;

    if (!connectorConfig || !connectorConfig.networks) {
      throw new Error(
        `Connector ${baseConnector} configuration not found or missing networks`,
      );
    }

    // Get active network
    const activeNetworks = Object.keys(connectorConfig.networks);
    if (activeNetworks.length === 0) {
      throw new Error(`No networks configured for ${baseConnector}`);
    }

    // Use mainnet-beta for Solana, mainnet for Ethereum by default, or first available network
    let activeNetwork = 'mainnet-beta';
    if (!connectorConfig.networks[activeNetwork]) {
      activeNetwork = activeNetworks[0];
    }

    // Set the pool in the active network and connector type
    const configPath = `${baseConnector}.networks.${activeNetwork}.${connectorType}.${pairKey}`;
    ConfigManagerV2.getInstance().set(configPath, poolAddress);

    logger.info(
      `Added default pool for ${connector}: ${pairKey} (address: ${poolAddress}) on network ${activeNetwork}`,
    );
  } catch (error) {
    logger.error(`Failed to add default pool: ${error}`);
    throw fastify.httpErrors.internalServerError(
      `Failed to add default pool: ${error.message}`,
    );
  }
};

export const removeDefaultPool = (
  fastify: FastifyInstance,
  connector: string,
  baseToken: string,
  quoteToken: string,
): void => {
  const pairKey = `${baseToken}-${quoteToken}`;

  const [baseConnector, connectorType] = connector.split('/');

  if (!baseConnector) {
    throw fastify.httpErrors.badRequest('Connector name is required');
  }

  if (!connectorType) {
    throw fastify.httpErrors.badRequest(
      'Connector type is required (e.g., amm, clmm)',
    );
  }

  try {
    // Get connector config
    const connectorConfig =
      ConfigManagerV2.getInstance().getNamespace(baseConnector)?.configuration;

    if (!connectorConfig || !connectorConfig.networks) {
      throw new Error(
        `Connector ${baseConnector} configuration not found or missing networks`,
      );
    }

    // Get active network
    const activeNetworks = Object.keys(connectorConfig.networks);
    if (activeNetworks.length === 0) {
      throw new Error(`No networks configured for ${baseConnector}`);
    }

    // Use mainnet-beta for Solana, mainnet for Ethereum by default, or first available network
    let activeNetwork = 'mainnet-beta';
    if (!connectorConfig.networks[activeNetwork]) {
      activeNetwork = activeNetworks[0];
    }

    // Delete the pool from the active network and connector type
    const configPath = `${baseConnector}.networks.${activeNetwork}.${connectorType}.${pairKey}`;
    ConfigManagerV2.getInstance().delete(configPath);

    logger.info(
      `Removed default pool for ${connector}: ${pairKey} on network ${activeNetwork}`,
    );
  } catch (error) {
    logger.error(`Failed to remove default pool: ${error}`);
    throw fastify.httpErrors.internalServerError(
      `Failed to remove default pool: ${error.message}`,
    );
  }
};
