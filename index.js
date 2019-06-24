'use strict';

const AWS = require('aws-sdk');
const request = require('request-promise-native');

const transformGroup = (group) => ({
  key: group.Keys[0],
  value: parseFloat(group.Metrics.AmortizedCost.Amount),
  text: group.Metrics.AmortizedCost.Amount + ' ' +
      group.Metrics.AmortizedCost.Unit,
});

const nonZeroGroupOnly = (group) => group.value > 0;

const byAmountDescTaxLast = (a, b) => {
  if (a.key === 'Tax') return 1;
  if (b.key === 'Tax') return -1;
  return b.value - a.value;
};

const groupsToFields = (fields, group) => {
  fields.push({type: 'mrkdwn', text: `*${group.key}*`});
  fields.push({type: 'plain_text', text: group.text});
  return fields;
};

exports.handler = async (event, context) => {
  if (!process.env.WEBHOOK_URL) {
    throw new Error('WEBHOOK_URL is not specified or invalid.');
  }

  const end = new Date().toISOString().substring(0, 10);
  let start = new Date();
  start.setDate(start.getDate() - 1);
  start = start.toISOString().substring(0, 10);

  const explorer = new AWS.CostExplorer({region: 'us-east-1'});
  const groups = await explorer.getCostAndUsage({
    TimePeriod: {
      Start: start,
      End: end,
    },
    Granularity: 'DAILY',
    Metrics: [
      'AmortizedCost',
    ],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
  }).promise()
      .then((result) => result.ResultsByTime[0].Groups)
      .then((groups) => groups.map(transformGroup))
      .then((groups) => groups.filter(nonZeroGroupOnly))
      .then((groups) => groups.sort(byAmountDescTaxLast));

  const total = groups.reduce((total, group) => total + group.value, 0);
  const body = {
    text: `Yesterday's cost was ${total} USD.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Total cost on ${start} was ${total} USD.`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: groups.reduce(groupsToFields, []),
      },
    ],
  };

  if (process.env.SLACK_USERNAME) {
    body.username = process.env.SLACK_USERNAME;
  }

  if (process.env.SLACK_ICON_URL) {
    body.icon_url = process.env.SLACK_ICON_URL;
  }

  if (process.env.SLACK_ICON_EMOJI) {
    body.icon_emoji = process.env.SLACK_ICON_EMOJI;
  }

  if (process.env.SLACK_CHANNEL) {
    body.channel = process.env.SLACK_CHANNEL;
  }

  return request.post({json: true, url: process.env.WEBHOOK_URL, body});
};
