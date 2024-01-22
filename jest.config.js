/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["<rootDir>/test/*.spec.ts"],
  moduleNameMapper: { "(.+)\\.js": "$1" }
}
