const webpack = require("webpack");
const { parsed: myEnv } = require("dotenv").config({
  path: `.env.${process.env.APP_ENV}`,
});

module.exports = {
  webpack(config) {
    if (process.env.APP_ENV !== undefined) {
      console.log(`Loading env from .env.${process.env.APP_ENV}`);
      config.plugins.push(new webpack.EnvironmentPlugin(myEnv));
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};
