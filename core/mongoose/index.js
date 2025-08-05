const createConnection = require('./create-connection');
const createModel = require('./create-model');
const DatabaseModel = require('./database-model');
const { MongooseTypes } = require('./enums');
const ModelSchema = require('./model-schema');

module.exports = {
  createConnection,
  createModel,
  ModelSchema,
  DatabaseModel,
  SchemaTypes: MongooseTypes,
};
