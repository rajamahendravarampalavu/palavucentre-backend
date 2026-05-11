function replaceObjectValues(target, source) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
}

export function validate(schema = {}) {
  return (req, _res, next) => {
    try {
      if (schema.params) {
        replaceObjectValues(req.params, schema.params.parse(req.params));
      }

      if (schema.query) {
        replaceObjectValues(req.query, schema.query.parse(req.query));
      }

      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
