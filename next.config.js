const webpack = require("webpack");
const { parsed: myEnv } = require("dotenv").config({
  path: `.env.${process.env.APP_ENV}`,
});

module.exports = {
  webpack(config, { isServer, dev }) {
    if (process.env.APP_ENV !== undefined) {
      console.log(`Loading env from .env.${process.env.APP_ENV}`);
      config.plugins.push(new webpack.EnvironmentPlugin(myEnv));

      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
      config.experiments = {
        topLevelAwait: true,
        asyncWebAssembly: true,
      };
      config.output.webassemblyModuleFilename =
        isServer && !dev
          ? "../static/wasm/[modulehash].wasm"
          : "static/wasm/[modulehash].wasm";
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};
