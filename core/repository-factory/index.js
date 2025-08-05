const createFactory = require('./create');
const createManyFactory = require('./create-many');
const findOneFactory = require('./find-one');
const findManyFactory = require('./find-many');
const updateOneFactory = require('./update-one');
const updateManyFactory = require('./update-many');
const deleteOneFactory = require('./delete-one');
const rawFactory = require('./raw');

/**
 * @typedef {Object} queryFunctionData
 * @property {Object} query - Query values
 * @property {Object} [projections] - Projections
 * @property {Object} [options] - Options
 */

/**
 * @typedef {Object} updateFunctionData
 * @property {Object} query - Query values
 * @property {Object} updateValues - Projections
 */

/**
 * @typedef {Object} createFunctionData
 */

/**
 * @typedef {Object} createManyFunctionData
 * @property {Object[]} entries - Entries
 * @property {Object} [options] - Options
 */

/**
 * @typedef {Object} deleteFunctionData
 * @property {Object} query - Query values
 * @property {Object} options - Query options
 */

/**
 * @template {keyof typeof import('../../models')} K
 * @param {K} modelName
 * @param {*} overrideMethods
 * @returns {{create: function(createFunctionData): Promise<import('../../models')[K]>, createMany: function(createManyFunctionData): Promise<import('../../models')[K][]>, findOne: function(queryFunctionData): Promise<import('../../models')[K]>, findMany:function(queryFunctionData): Promise<import('../../models')[K][]>, updateOne: function(updateFunctionData): Promise<{acknowledged: Boolean, modifiedCount: Number}>, updateMany: function(updateFunctionData): Promise<{acknowledged: Boolean, modifiedCount: Number}>, deleteOne: function(deleteFunctionData): Promise<{deletedCount: number}>,raw: function(): import('./raw').NativeModel}}
 */
function createRepositoryFactory(modelName) {
  return {
    create: createFactory(modelName),
    createMany: createManyFactory(modelName),
    findOne: findOneFactory(modelName),
    findMany: findManyFactory(modelName),
    updateOne: updateOneFactory(modelName),
    updateMany: updateManyFactory(modelName),
    deleteOne: deleteOneFactory(modelName),
    raw: rawFactory(modelName),
  };
}

module.exports = createRepositoryFactory;
