const getModel = require('./get-model');

/**
 * @typedef {import('mongoose').Model} NativeModel
 */

/**
 * Generates a Raw repository function for the given model name
 *
 * @template {keyof typeof import('../../models')} K
 * @param {K} modelName - The name of the model.
 * @returns {NativeModel} - The native model instance
 */
function rawFactory(modelName) {
  const model = getModel(modelName);

  return function () {
    return model;
  };
}
module.exports = rawFactory;
