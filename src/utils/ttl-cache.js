export function createTtlCache({ ttlMs = 30_000 } = {}) {
  let value;
  let expiresAt = 0;
  let pendingPromise = null;

  return {
    async get(loadValue) {
      const now = Date.now();

      if (expiresAt > now && value !== undefined) {
        return value;
      }

      if (pendingPromise) {
        return pendingPromise;
      }

      pendingPromise = Promise.resolve(loadValue())
        .then((nextValue) => {
          value = nextValue;
          expiresAt = Date.now() + ttlMs;
          return nextValue;
        })
        .finally(() => {
          pendingPromise = null;
        });

      return pendingPromise;
    },
    set(nextValue) {
      value = nextValue;
      expiresAt = Date.now() + ttlMs;
      return nextValue;
    },
    clear() {
      value = undefined;
      expiresAt = 0;
      pendingPromise = null;
    },
  };
}

export function createKeyedTtlCache({ ttlMs = 30_000, serializeKey = (key) => JSON.stringify(key) } = {}) {
  const store = new Map();

  return {
    async get(key, loadValue) {
      const cacheKey = serializeKey(key);
      const entry = store.get(cacheKey);
      const now = Date.now();

      if (entry?.expiresAt > now && entry.hasOwnProperty("value")) {
        return entry.value;
      }

      if (entry?.pendingPromise) {
        return entry.pendingPromise;
      }

      const pendingPromise = Promise.resolve(loadValue())
        .then((value) => {
          store.set(cacheKey, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
          return value;
        })
        .catch((error) => {
          store.delete(cacheKey);
          throw error;
        });

      store.set(cacheKey, {
        pendingPromise,
        expiresAt: 0,
      });

      return pendingPromise;
    },
    clear(key) {
      if (typeof key === "undefined") {
        store.clear();
        return;
      }

      store.delete(serializeKey(key));
    },
  };
}
