/**
 * Higher-order Express middleware to validate request parameters, query, and body using Zod.
 * @param {Object} schemas - Object containing schemas for body, query, and/or params
 * @param {import('zod').ZodType} [schemas.body] - Zod schema for req.body
 * @param {import('zod').ZodType} [schemas.query] - Zod schema for req.query
 * @param {import('zod').ZodType} [schemas.params] - Zod schema for req.params
 */
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  } catch (error) {
    // Forward parsing error (ZodError) to global error handler
    next(error);
  }
};

module.exports = validate;
