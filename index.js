'use strict';

const AWS = require('aws-sdk');
const axios = require('axios').default;

const getTimePeriod = () => {
  let start = null;
  let end = new Date();

  switch (process.env.GRANULARITY) {
    case 'DAILY': {
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      break;
    }

    case 'MONTHLY': {
      end = new Date(end.getFullYear(), end.getMonth(), 1);
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      break;
    }

    default:
      console.error('Invalid granularity');
      return;
  }

  return {
    Start: start.toISOString().substr(0, 10),
    End: end.toISOString().substr(0, 10),
  };
};

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

const round = (number, precision) => {
  const shift = (number, precision, reverse) => {
    if (reverse) precision = -precision;
    const numArray = ('' + number).split('e');
    return +(numArray[0] + 'e' + (
      numArray[1] ? (+numArray[1] + precision) : precision));
  };

  return shift(Math.round(shift(number, precision, false)), precision, true);
};

exports.handler = async () => {
  if (!process.env.WEBHOOK_URL) {
    console.error('WEBHOOK_URL is not specified or invalid.');
    return;
  }

  const explorer = new AWS.CostExplorer({region: 'us-east-1'});
  const groups = await explorer.getCostAndUsage({
    TimePeriod: getTimePeriod(),
    Granularity: process.env.GRANULARITY,
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
      .then((groups) => groups.sort(byAmountDescTaxLast))
      .catch(console.error);
  if (!groups) return;

  const total = groups.reduce((total, group) => total + group.value, 0);
  const body = {
    text: `Yesterday's cost was ${round(total, 4)} USD.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Total cost was ${total} USD.`,
        },
      },
      {
        type: 'divider',
      },
    ],
  };

  while (groups.length > 0) {
    body.blocks.push({
      type: 'section',
      fields: groups.splice(0, 5).reduce(groupsToFields, []),
    });
  }

  return axios.post(process.env.WEBHOOK_URL, body)
      .then(({data}) => data)
      .catch(console.error);
};
