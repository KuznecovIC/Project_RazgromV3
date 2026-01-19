module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        // Отключаем source-map-loader для проблемных библиотек
        webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
          if (rule.enforce === 'pre' && rule.use && rule.use.loader && rule.use.loader.includes('source-map-loader')) {
            rule.exclude = [
              /node_modules\/face-api.js/,
              /node_modules\/postprocessing/,
              /node_modules\/three/
            ];
          }
          return rule;
        });
        return webpackConfig;
      }
    }
  };