import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  name: 'aws-cost-report-slack',
  copyrightOwner: 'Shinya Tsuda',
  license: 'MIT',

  projenrcTs: true,
  buildWorkflow: false,
  release: false,
  defaultReleaseBranch: 'main',
  depsUpgrade: false,
  pullRequestTemplate: false,
  githubOptions: {
    pullRequestLint: false,
  },
  readme: {
    filename: '',
  },

  cdkVersion: '2.233.0',
  deps: [
    '@aws-sdk/client-cost-explorer',
    '@slack/webhook',
    '@types/aws-lambda',
  ],
});
project.synth();
