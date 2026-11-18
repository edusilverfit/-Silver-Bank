module.exports = {
  testEnvironment: "node",

  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: false,
          },
          target: "es2022",
          transform: {
            decoratorMetadata: false,
          },
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/?(*.)+(spec|test).ts",
  ],

  clearMocks: true,
};