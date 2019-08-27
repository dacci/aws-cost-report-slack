# Synopsis

Gathers per-service cost of the previous day or month, and reports to a Slack workspace by webhook.

# Deployment

``` bash
serverless deploy --webhook-url https://hooks.slack.com/services/some/webhook/url
```

## Options

* webhook-url (Required)

  The URL of the webhook.

* granularity (Optional)

  Set cost granularity to `DAILY` (default) or `MONTHLY`.

* schedule (Optional)

  Specify when to report. Accepts [AWS schedule syntax](http://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html).
  Default is `cron(30 0 * * ? *)` for _DAILY_ granularity and `cron(30 0 1 * ? *)` for _MONTHLY_ granularity.

* dlq (Optional)

  Specify DLQ resource. Must be an ARN of SQS or SNS.
