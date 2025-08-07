/* eslint-disable no-param-reassign */
const getModel = require('./get-model');

/**
 * @typedef {Object} functionData
 * @property {Object} query - Query values
 * @property {Object} [projections] - Projections
 * @property {Object} [options] - Options
 */

/**
 * Generates a FindOne repository function for the given model name
 *
 * @template {keyof typeof import('../../models')} K
 * @param {K} modelName - The name of the model.
 * @returns {function(functionData): Promise<import('../../models')[K]>} - A model instance
 */
function findOneFactory(modelName) {
  const model = getModel(modelName);

  async function findOneFunction(_data) {
    if (!_data.query || typeof _data.query !== 'object')
      throw new Error('Cannot run model operation. Query is required');

    const data = { ..._data };

    // prevent retrieval of soft deleted records
    if (model.__appConfig?.paranoid) {
      data.query.deleted = 0;
    }

    const foundData = await model.findOne(data.query, data.projections, {
      lean: true,
      ...data.options,
    });
    return foundData;
  }
  return findOneFunction;
}
module.exports = findOneFactory;
