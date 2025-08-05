/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts","tsx","js","jsx","json","node"],
  testMatch: ["**/__tests__/**/*.(ts|tsx)","**/?(*.)+(spec|test).(ts|tsx)"],
  transform: { "^.+\\.(ts|tsx)$": "ts-jest" },
  globals: {
    "ts-jest": { tsconfig: "tsconfig.json" }
  },
  // чтобы Jest не пытался подхватить реальные next/font
  moduleNameMapper: {
    "^next/font/google$": "<rootDir>/__mocks__/nextFontGoogle.ts"
  },
  // увеличиваем общий таймаут на инициализацию
  testTimeout: 20000
};