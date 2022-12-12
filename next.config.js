const webpack = require("webpack");
const { parsed: myEnv } = require("dotenv").config({
  path: `.env.${process.env.APP_ENV}`,
});

console.log(`Loading env from .env.${process.env.APP_ENV}`);

module.exports = {
  webpack(config) {
    config.plugins.push(new webpack.EnvironmentPlugin(myEnv));
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};
