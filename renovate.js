/*eslint no-undef: "error"*/
/*eslint-env node*/

module.exports = {
  extends: ["config:base", ":semanticCommitsDisabled"],
  prConcurrentLimit: 30,
  prHourlyLimit: 30,
  prCreation: "not-pending",
  pinDigests: true,
  onboarding: false,
  gitAuthor: "Renovate Bot <bot@renovateapp.com>",
  logLevel: "debug",
  requireConfig: false,
  platform: "github",
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
      packageNames: ["gatsby"],
      schedule: ["before 3am on monday"],
    },
  ],
};
