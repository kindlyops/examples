/*eslint no-undef: "error"*/
/*eslint-env node*/

module.exports = {
  extends: ["config:base", ":semanticCommitsDisabled"],
  prConcurrentLimit: 30,
  prHourlyLimit: 30,
  prCreation: "immediate",
  pinDigests: true,
  onboarding: false,
  logLevel: "debug",
  requireConfig: false,
  platform: "github",
  gitAuthor: "KindlyMachine <support@kindlyops.com>",
  dependencyDashboard: true,
  reviewersFromCodeOwners: true,
  enabledManagers: ["github-actions", "npm", "gomod"],
  "github-actions": {
    fileMatch: ["^\\.github/workflows/[^/]+\\.ya?ml$"],
    pinDigests: true,
    labels: ["dependencies", "github"],
  },
  gomod: {
      labels: ["dependencies", "go"]
  },
  postUpdateOptions: ["gomodTidy"],
  npm: {
    labels: ["dependencies", "javascript"],
  },
  packageRules: [
    {
      packagePatterns: [ "constructs" ],
      groupName: "aws-cdk monorepo",
      schedule: ["on the first day of the month"],
    },
  ],
};
