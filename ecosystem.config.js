module.exports = {
  apps: [
    {
      name: "yure",
      script: "dist/index.js",
      env: { NODE_ENV: "production" },
    },
  ],
};
