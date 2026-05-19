import { awscdk, javascript } from 'projen';
import { JobPermission } from 'projen/lib/github/workflows-model';

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
  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion: '11.0.0',
});

const deploy = project.github?.addWorkflow('deploy');
deploy?.on({
  push: {
    branches: ['main'],
  },
});
deploy?.addJob('deploy', {
  permissions: {
    contents: JobPermission.READ,
    idToken: JobPermission.WRITE,
  },
  runsOn: ['ubuntu-latest'],
  steps: [
    {
      name: 'Checkout',
      uses: 'actions/checkout@v6',
    },
    {
      run: 'corepack enable',
    },
    {
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v6',
      with: {
        'node-version': 24,
        'cache': 'pnpm',
      },
    },
    {
      name: 'Install dependencies',
      run: 'pnpm install --frozen-lockfile',
    },
    {
      name: 'Run tests',
      run: 'pnpm test',
    },
    {
      name: 'Configure AWS credentials',
      uses: 'aws-actions/configure-aws-credentials@v6',
      with: {
        'role-to-assume': '${{ secrets.ACTIONS_ROLE_ARN }}',
        'aws-region': '${{ vars.AWS_REGION }}',
      },
    },
    {
      name: 'Deploy',
      run: 'pnpm cdk deploy --ci --require-approval never',
    },
  ],
});

const mergeDependabotPr = project.github?.addWorkflow('merge-dependabot-pr');
mergeDependabotPr?.on({
  pullRequest: {},
});
mergeDependabotPr?.addJob('dependabot', {
  permissions: {
    pullRequests: JobPermission.WRITE,
    contents: JobPermission.WRITE,
  },
  if: "${{ github.actor == 'dependabot[bot]' }}",
  runsOn: ['ubuntu-latest'],
  steps: [
    {
      name: 'Merge Dependabot PR',
      run: 'gh pr merge --auto --merge "$PR_URL"',
      env: {
        PR_URL: '${{ github.event.pull_request.html_url }}',
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      },
    },
  ],
});

project.synth();
