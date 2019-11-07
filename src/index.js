import url from 'url';
import fs from 'fs';

import parser from 'swagger-parser';

import ConfigureRouter from './ConfigureRouter';
import PrunePaths from './PrunePaths';

export default function(config) {
  if (!config.swaggerFile) {
    throw new Error('Config is missing `swaggerFile` parameter');
  }

  if (config.ignorePaths && config.mockRoutes) {
    throw new Error('Cannot specify both ignorePaths and mockPaths in config');
  }

  let basePath;
  let router;

  function init(api) {
    if (config.ignorePaths) {
      api.paths = PrunePaths(api.paths, config.ignorePaths);
    } else if (config.mockPaths) {
      api.paths = PrunePaths(api.paths, config.mockPaths, true);
    }

    basePath = api.basePath || '';
    router = ConfigureRouter(api.paths);
  }

  let parserPromise = new Promise((resolve) => {
    parser.dereference(config.swaggerFile, function(err, api) {
      if (err) throw err;

      init(api);
      resolve();
    });
  });

  if (config.watch) {
    fs.watchFile(config.swaggerFile, function() {
      parser.dereference(config.swaggerFile, function(err, api) {
        if (err) throw err;

        init(api);
      });
    });
  }

  // eslint-disable-next-line consistent-return
  return async function(req, callback) {
    await parserPromise;
    const method = req.method.toLowerCase();

    let path = url.parse(req.url).pathname;
    path = path.replace(basePath + '/', '');
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }

    const matchingRoute = router.match('/' + method + path);

    // eslint-disable-next-line consistent-return
    let worker = function(cb) {
      if (!matchingRoute) {
        cb();
        return;
      }

      if (process.env.debug) {
        console.log('Request: %s %s', req.method, path);
      }

      try {
        const response = matchingRoute.fn();
        cb({
          statusCode: 200,
          contentType: 'application/json',
          body: response !== null ? JSON.stringify(response) : ''
        });
      } catch (e) {
        cb({
          statusCode: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: e.message
          }, null, 4)
        });
      }
    };
    if (callback === undefined) {
      return new Promise(res => {
        worker(res);
      });
    }
    worker(callback);
  };
}
