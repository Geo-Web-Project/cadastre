module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    config.plugins.push(new webpack.IgnorePlugin(/\/__tests__\//));

    config.node = {
      fs: "empty",
      child_process: "empty",
    };

    // Important: return the modified config
    return config;
  },
};
