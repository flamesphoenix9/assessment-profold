# Resilience17 Backend Assessment for Node.js

This project follows the MVC architecture and incorporates clean OOP concepts such as repositories and proxies/interactors to abstract dependencies. It also adheres to functional programming paradigms and JavaScript conventions.

# Data Flow Overview

The typical flow of data is:

**Client Request → Server Function → Middleware (Optional) → Endpoint Handler → Client Request Service Function → Third Party Request**

---

# Programming Conventions

- Files that export a function should start with a verb to indicate an action; otherwise, they should be named as nouns.
- Exports from a file should match the file name to enable easy identification of resources.
- Use **kebab-case** for filenames.
- Use **camelCase** for functions and variable names.
- Use **snake_case** for request and response payloads.

---

# Folder Overview

## Core Folder

The `core` folder defines abstractions for common dependencies used in developing backend applications in Node.js. These include:

- Express
- Database access
- Crypto/hashing libraries
- JWT
- Loggers
- Error handlers
- Data validators
- External network requests, etc.

Each subfolder is a local library that can be imported into your code like so: `@app-core/{foldername}`.

---

## Entry Point and Endpoints

The entry point to the application is `app.js`, which creates the Express app, establishes the database connection, and registers endpoints defined in the `endpoints` folder.

Endpoints are organized by resource into subfolders within the `endpoints` directory. For example, `/users` HTTP endpoints are stored in the `endpoints/users` folder. The filename for each endpoint should start with a verb.

Each endpoint file uses the `createHandler` function to define the route and its corresponding controller/handler. The handler’s role is primarily to prepare a service argument object for the relevant service that processes the request.

### Example

Create a registration endpoint

**Filename: /endpoints/onboarding/register.js**

```javascript
const { createHandler } = require('@app-core/server');
const registerService = require('../../services/onboarding/register');

module.exports = createHandler({
  path: '/register',
  method: 'post',
  async handler(rc, helpers) {
    const payload = rc.body;
    payload.requestMeta = rc.properties;

    const response = await registerService(payload);
    return {
      status: helpers.http_statuses.HTTP_201_CREATED,
      data: response,
    };
  },
});
```

---

## Middlewares

Middleware functions are defined in the `middlewares` folder and exposed via the `index.js` file within that folder. Middleware functions are also defined using the `createHandler` function (but without specifying a path or method).

Middleware, like endpoints, can delegate work to services—especially when database access is needed (see more on this below). To add data to the request object, return a `RequestArguments` object from the middleware.

### Example

Simple user authentication middleware

**Filename: /middlewares/user-auth.js**

```javascript
const { createHandler } = require('@app-core/server');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const AuthenticationMessages = require('@app-core/messages/authentication');

module.exports = createHandler({
  path: '*',
  method: '',
  async handler(rc) {
    const authHeader = rc.headers.authorization;

    if (!authHeader) {
      throwAppError(AuthenticationMessages.MISSING_AUTH_HEADER, ERROR_CODE.NOAUTHERR);
    }

    return {
      augments: { meta: { user: {} } },
    };
  },
});
```

Expose middlewares throught the `/middlewares/index.js` file

```javascript
const userAuth = require('./user-auth');

module.exports = {
  userAuth,
};
```

---

## Services

Services are functions that perform specific units of work. The name of a service function should clearly indicate what it does. Request service functions handle client requests and are invoked by the handlers. Other helper functions can be created to assist the request services.

Strive to keep your code **DRY** (Don't Repeat Yourself). Group service functions by resource. For example, all `login`, `register`, `logout`, and `forgotPassword` services should be placed in the `services/onboarding` folder.

Utility functions shared across resources (e.g., `getCurrentDatetime`) should be stored in the `services/utils` folder.

The return object from a request service function is sent directly to the client, so ensure it is formatted appropriately. You can use response handler functions for formatting.

### Example

```javascript
const validator = require('@app-core/validator');

const parsedSpec = validator.parse(`root{
  name is a required string
  email is a required email
  password is a required string
}`);

async function registerUser(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);

  // code logic

  return response;
}

module.exports = registerUser;
```

---

## Error Handling

Errors should be thrown using the `throwAppError` function from the `@app-core/errors` library. This function takes in a message and an error code.

Error messages should be stored in the `/messages` folder, with message files categorized by resource.

Use an error code from the `ERROR_CODE` object exported by the same library. Errors thrown this way are automatically handled by the server functions that manage requests and responses.

---

## Logging

The `@app-core/logger` library exposes two main loggers:

- `appLogger` – For general logs
- `timeLogger` – For measuring process execution duration

Server functions automatically log all request and error responses. These loggers are mostly used for logging in background processes.

---

## External Network Requests

Use the `@app-core/http-request` library to make external network requests to third-party APIs. This library is designed with an accompanying mocking module and an interface similar to the popular Axios library.

It simplifies making external requests outside the application.

---

# How to Start the Server

Follow these steps to run the application locally:

### 1. Install Dependencies

```bash
npm install
```

### 2. Register Your Endpoint Folder

Open the `app.js` file and add your endpoint folder to the `ENDPOINT_CONFIGS` array:

```javascript
const ENDPOINT_CONFIGS = [{ path: './endpoints/{your-endpoint-folder-name}/' }];
```

> Replace `{your-endpoint-folder-name}` with the actual folder name of your endpoint.

### 3. Start the Server

In your terminal, run the following command:

```bash
node app.js
```

The server should now be running and ready to handle requests at the port 8811 or any port configured in the `.env` file

---
