// eslint-disable-next-line import/no-anonymous-default-export
export default {
  
  "testEnvironment": "node",
  "collectCoverage": true,

  "collectCoverageFrom": ["src/**/*.{js,jsx,ts,tsx}", "!**/node_modules/**", "!**/*.d.ts"],
  "coverageProvider": "v8",

  "coverageThreshold": {
    "global": {
      "branches": 45,
      "functions": 49,
      "lines": 54,
      "statements": -300
    }
  },
  "transform": {
    "^.+\\.(t|j|mj)s?$": "@swc/jest"
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: [ ".ts", ".mts"]
}
