const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const getModel = require('./get-model');

/**
 * @typedef {Object} functionData
 * @property {Object} query - Query values
 * @property {Object} updateValues - Projections
 */

/**
 * Generates an UpdateMany repository function for the given model name
 *
 * @template {keyof typeof import('../../models')} K
 * @param {K} modelName - The name of the model.
 * @returns {function(functionData): Promise<{acknowledged: Boolean, modifiedCount: Number}>}
 */
function updateManyFactory(modelName) {
  const model = getModel(modelName);

  return async function (_data) {
    try {
      if (!_data.query || typeof _data.query !== 'object') {
        throw new Error('Cannot run model operation. Query is required');
      }

      if (!_data.updateValues || typeof _data.updateValues !== 'object') {
        throw new Error('Cannot run model operation. updateValues is required');
      }

      const data = { ..._data };
      data.updateValues.updated = Date.now();

      // prevent modification of soft deleted records
      if (model.__appConfig?.paranoid) {
        data.query.deleted = 0;
      }

      const updateResult = await model.updateMany(data.query, data.updateValues);

      return {
        acknowledged: !!updateResult.acknowledged,
        modifiedCount: updateResult.modifiedCount,
      };
    } catch (e) {
      const errorCode = parseInt(e.code, 10);

      if (errorCode === 11000) {
        const existingFields = Object.keys(e.keyPattern || {}).join(',');

        throwAppError(`An existing ${existingFields} record exists.`, ERROR_CODE.DUPLRCRD);
      } else {
        throw e;
      }
    }
  };
}
module.exports = updateManyFactory;
