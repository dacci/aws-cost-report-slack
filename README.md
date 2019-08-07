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

* slack-username (Optional)

  Override the display name.

* slack-icon-url (Optional)

  Override the icon with the specified URL.

* slack-icon-emoji (Optional)

  Override the icon with the specified emoji such as `:hankey:`.

* slack-channel (Optional)

  Override the report destination to `#channel` or `@username`.
