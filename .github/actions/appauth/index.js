#!/usr/bin/env node

const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");

async function main() {

  const botId = core.getInput('app_id');
  const botKey = core.getInput('private_key');
  const [owner, repo ] = env.GITHUB_REPOSITORY.split("/");
  const app = createAppAuth({ appId: botId, privateKey: botKey });
  const authApp = await app({ type: "app" });
  const octo = new Octokit({
    auth: authApp.token,
  });

  const {
    data: { id: installationId }
  } = await octo.request('GET /repos/{owner}/{repo}/installation', {
    owner: owner,
    repo: repo,
  });

  const installationAuth = await app({ installationId, type: "installation" });
  return installationAuth.token;
}

function handleSuccess(token) {
  console.log("::set-output name=token::%s", result);
  return;
}

function handleError(error) {
  console.log("Error retrieving token: %o", error);
  return;
}

main().then(handleSuccess).catch(handleError);
