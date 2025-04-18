import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

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

    const webhookUrl = new cdk.CfnParameter(this, 'WebhookURL');

    const handler = new lambda_nodejs.NodejsFunction(this, 'Handler', {
      entry: 'app/index.ts',
      runtime: lambda.Runtime.NODEJS_22_X,
      bundling: {
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(60),
      environment: {
        WEBHOOK_URL: webhookUrl.valueAsString,
        GRANULARITY: granularity,
        NODE_OPTIONS: '--enable-source-maps',
      },
      architecture: lambda.Architecture.ARM_64,
      maxEventAge: cdk.Duration.seconds(60),
      retryAttempts: 0,
    });

    handler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ce:GetCostAndUsage'],
      resources: ['*'],
    }));

    new logs.LogGroup(handler, 'LogGroup', {
      logGroupName: `/aws/lambda/${handler.functionName}`,
      retention: logs.RetentionDays.SIX_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression(schedule),
    });

    rule.addTarget(new events_targets.LambdaFunction(handler));
  }
}

const app = new cdk.App();

new Stack(app, 'Stack', {
  stackName: 'aws-cost-report-slack',
});

app.synth();
