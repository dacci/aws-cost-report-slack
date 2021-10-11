import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { Architecture } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { App, CfnParameter, Duration, RemovalPolicy, Stack } from '@aws-cdk/core';

const app = new App();

const granularity = app.node.tryGetContext('granularity') as string ?? 'MONTHLY';
let schedule: string;
switch (granularity) {
  case 'DAILY':
    schedule = 'cron(30 0 * * ? *)';
    break;

  case 'MONTHLY':
    schedule = 'cron(0 0 3 * ? *)';
    break;

  default:
    throw new Error(`Unsupported granularity: ${granularity}`);
}

const stack = new Stack(app, 'Stack', {
  stackName: 'aws-cost-report-slack',
});

const webhookUrl = new CfnParameter(stack, 'WebhookURL');

const handler = new NodejsFunction(stack, 'Handler', {
  entry: 'src/index.ts',
  bundling: {
    minify: true,
    sourceMap: true,
  },
  timeout: Duration.seconds(60),
  environment: {
    WEBHOOK_URL: webhookUrl.valueAsString,
    GRANULARITY: granularity,
    NODE_OPTIONS: '--enable-source-maps',
  },
  architecture: Architecture.ARM_64,
  maxEventAge: Duration.seconds(60),
  retryAttempts: 0,
});

handler.addToRolePolicy(new PolicyStatement({
  actions: ['ce:GetCostAndUsage'],
  resources: ['*'],
}));

new LogGroup(handler, 'LogGroup', {
  logGroupName: `/aws/lambda/${handler.functionName}`,
  retention: RetentionDays.SIX_MONTHS,
  removalPolicy: RemovalPolicy.DESTROY,
});

const rule = new Rule(stack, 'Rule', {
  schedule: Schedule.expression(schedule),
});

rule.addTarget(new LambdaFunction(handler));
