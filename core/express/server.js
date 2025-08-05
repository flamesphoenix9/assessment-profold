/* eslint-disable no-empty */
/* eslint-disable global-require */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
const expressEnums = require('./enums');
/**
 * @typedef {Object} ExpressServerConfig
 * @property {number} [port] - Optional parameter that defines the port the express server should listen on.
 * @property {string} [JSONLimit] - The max size allowed to be passed in the request body as JSON.
 * @property {boolean} [enableCors] - Optional parameter used to configure whether or not the server should allow CORS requests.
 * @property {boolean} [generateRequestIds] - Optional parameter indicating whether or not unique request IDs should be generated for every request that hits the server.
 */

/**
 *
 * @param {ExpressServerConfig} serverConfig
 * @returns
 */
function Server(serverConfig = {}) {
  const express = require('express');
  const { appLogger } = require('@app-core/logger');
  const { ERROR_STATUS_CODE_MAPPING } = require('@app-core/errors');
  const cors = require('cors');
  const { getClientIp } = require('request-ip');
  const app = express();

  const errorCodeMappings = ERROR_STATUS_CODE_MAPPING;

  function sanitizeInputObject(inputObject) {
    let objectClone = {};
    try {
      // Todo: replace with a more optimal JSON stringifier
      objectClone = JSON.parse(JSON.stringify(inputObject || {}));
    } catch (e) {}
    const sanitizableFields = ['authorization', 'authorisation', 'password'];
    sanitizableFields.forEach((s) => {
      if (objectClone[s]) {
        objectClone[s] = '*****masked******';
      }
    });
    return objectClone;
  }

  function createRequestLog(request) {
    return {
      requestURL: request.originalUrl,
      _url: request.url,
      body: sanitizeInputObject(request.body),
      query: sanitizeInputObject(request.query),
      headers: process.env.SHOW_RAW_HEADERS
        ? request.headers
        : sanitizeInputObject(request.headers),
    };
  }

  const {
    port = 8811,
    JSONLimit = '50mb',
    enableCors = false,
    // generateRequestIds = false
  } = serverConfig;

  if (enableCors) {
    app.use(cors());
  }

  // Todo: pass in directories that we can set as public paths to use in express app.static whatever
  app.use(express.json({ limit: JSONLimit }), (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      res.status(400).json({
        code: 'ERR',
        error: true,
        message: 'Error encountered in parsing request payload. Please check payload and try again',
      });
    } else {
      next();
    }
  });

  const handlerHelpers = {};
  handlerHelpers.http_statuses = expressEnums.HTTPStatusCode;

  const LOG_APP_REQUEST = parseInt(process.env.LOG_APP_REQUEST, 10);

  /**
   *
   * @param {import('./create-handler').HandlerConfiguration} handlerConfiguration
   */
  function addHandler(handlerConfiguration) {
    const { method, path } = handlerConfiguration;
    app[method](path, async (expressRequest, expressResponse) => {
      try {
        const middlewares = handlerConfiguration.middlewares || [];
        const { body, query, params, headers } = expressRequest;
        const meta = {};

        if (LOG_APP_REQUEST) {
          const requestLog = createRequestLog(expressRequest);
          appLogger.info(requestLog, `${method} ${path}`);
        }

        /** @type {import("./create-handler").RequestProperties} */
        const properties = {};
        properties.IP = getClientIp(expressRequest);
        properties.baseURL = expressRequest.baseUrl;
        properties.method = expressRequest.method;
        properties.requestURL = expressRequest.originalUrl;
        properties.requestURLWithoutQueryStrings = expressRequest.path;
        properties.handlerPath = path;
        properties.hostname = expressRequest.hostname;
        properties.userAgent = expressRequest.headers['user-agent'];

        /** @type {import("./create-handler").RequestComponents} */
        const requestComponents = {
          body,
          query,
          params,
          headers,
          meta,
          props: handlerConfiguration.props || {},
          properties,
        };
        /**
         * Do Middleware stuff here
         */
        /** @type {import("./create-handler").HandlerExecutionContext} */
        let middlewareExecutionContext = {};
        for (const middleware of middlewares) {
          if (middlewareExecutionContext.shouldSkipOtherMiddlewares) {
            middlewareExecutionContext.shouldSkipOtherMiddlewares = false;
            break;
          }

          if (middlewareExecutionContext.shouldSkipNextMiddleware) {
            middlewareExecutionContext.shouldSkipNextMiddleware = false;
            continue;
          }

          middlewareExecutionContext = {};

          /** @type {import("./create-handler").HandlerResult} */
          const middlewareExecutionResult = await middleware.handler(
            requestComponents,
            handlerHelpers
          );

          if (middlewareExecutionResult.skipOtherMiddlewares) {
            middlewareExecutionContext.shouldSkipOtherMiddlewares = true; // Skip all other middlewares. Use the context object to hold this
          }

          if (middlewareExecutionResult.skipNextMiddleware) {
            middlewareExecutionContext.shouldSkipNextMiddleware = true; // Skip next middleware. Use the context object to hold this
          }

          const middlewareAugments = middlewareExecutionResult.augments || {};
          if (middlewareAugments.meta) {
            requestComponents.meta = {
              ...requestComponents.meta,
              ...middlewareAugments.meta,
            };
          }

          if (middlewareAugments.body) {
            requestComponents.body = {
              ...requestComponents.body,
              ...middlewareAugments.body,
            };
          }

          if (middlewareAugments.query) {
            requestComponents.query = {
              ...requestComponents.query,
              ...middlewareAugments.query,
            };
          }

          if (middlewareAugments.params) {
            requestComponents.params = {
              ...requestComponents.params,
              ...middlewareAugments.params,
            };
          }

          if (middlewareAugments.headers) {
            requestComponents.headers = {
              ...requestComponents.headers,
              ...middlewareAugments.headers,
            };
          }

          if (middlewareExecutionResult.endHandlerChain) {
            middlewareExecutionContext.shouldEndRequest = true;
            middlewareExecutionContext.result = middlewareExecutionResult;
            break;
          }
        }

        /** @type {import("./create-handler").HandlerResult} */
        let result;
        if (!middlewareExecutionContext.shouldEndRequest) {
          result = await handlerConfiguration.handler(requestComponents, handlerHelpers);
        } else {
          result = middlewareExecutionContext.result;
        }

        expressResponse.status(result.status || 200).json(result.data || {});
      } catch (error) {
        const statusCode = errorCodeMappings[error.errorCode] || 400;

        const requestLog = createRequestLog(expressRequest);

        requestLog.errorCode = error.errorCode;
        requestLog.errorMessage = error.message;
        requestLog.errorContext = error.context;
        requestLog.errorStack = error.stack;

        appLogger.error(requestLog, `error: ${statusCode} ${method} ${path}`);

        expressResponse.status(statusCode).json({
          code: error.errorCode || 'ERR',
          error: true,
          message: error.isApplicationError ? error.message : 'Some error occured.',
          details: error.details,
        }); // Todo: Add a callback config that can be used to handle this in a custom way.
      }
    });
  }

  /**
   * @param {import("express").Request} request
   * @param {import("express").Response} response
   * @param {import("express").NextFunction} nextFunction
   * @returns
   */
  function executeRequest(request, response, nextFunction) {
    return app(request, response, nextFunction);
  }

  function startServer() {
    app.listen(port, () => {
      appLogger(`Listening at port ${port}`);
    });
  }

  return {
    startServer,
    addHandler,
    executeRequest,
  };
}
module.exports = Server;
