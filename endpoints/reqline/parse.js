const { createHandler } = require('@app-core/server');

const parseReqlineService = require('../../services/reqline/parse');

module.exports = createHandler({
  path: '/',
  method: 'post',

  async handler(rc, helpers) {
    const { reqline } = rc.body;
    if (!reqline) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          error: true,
          message: 'Missing reqline in request body',
        },
      };
    }
    try {
      const result = await parseReqlineService({ reqline });
      return {
        status: helpers.http_statuses.HTTP_200_OK,
        data: result,
      };
    } catch (error) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          error: true,
          message: error.message,
        },
      };
    }
  },
});
