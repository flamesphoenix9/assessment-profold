const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { ulid } = require('@app-core/randomness');
const getModel = require('./get-model');

function extractRecord(recordDocument) {
  return recordDocument._doc || recordDocument;
}

/**
 * @typedef {Object} functionData
 */

/**
 * Generates a Create repository function for the given model name
 *
 * @template {keyof typeof import('../../models')} K
 * @param {K} modelName - The name of the model.
 * @returns {function(functionData): Promise<import('../../models')[K]>} - A model instance
 */
function createFactory(modelName) {
  const Model = getModel(modelName);

  return async function (data) {
    try {
      const cloneData = { ...data };
      cloneData.created = Date.now();
      cloneData.updated = cloneData.created;

      if (Model.__appConfig?.supportULIDID) {
        cloneData._id = ulid();
      }

      const createdData = await new Model(cloneData).save();

      // ensure we get back a simple Javascript Object.
      return extractRecord(createdData);
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
module.exports = createFactory;
