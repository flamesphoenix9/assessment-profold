/* eslint-disable node/no-unpublished-require */
const models = require('../../models');
const { MockModels } = require('../../mock-models');

let modelReference;
const useMockModel = parseInt(process.env.USE_MOCK_MODEL, 10);

if (!useMockModel) {
  modelReference = models;
} else {
  modelReference = MockModels;
}

/**
 * Retrieves a model based on the provided model name.
 * @template {keyof typeof models} T
 * @param {T} modelName - The name of the model to retrieve.
 * @returns {typeof models[T]} The requested model.
 * @throws {Error} If no model name is provided.
 */
function getModel(modelName) {
  const model = modelReference[modelName];
  return model;
}

module.exports = getModel;
