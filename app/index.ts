import type { ScheduledHandler } from 'aws-lambda';

import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import * as utils from './utils';

const { WEBHOOK_URL, GRANULARITY } = process.env;

export const explorer = new CostExplorerClient({ region: 'us-east-1' });
export const webhook = new IncomingWebhook(WEBHOOK_URL ?? '');

export const handler: ScheduledHandler = async () => {
  const groups = await explorer
    .send(new GetCostAndUsageCommand({
      TimePeriod: utils.getTimePeriod(GRANULARITY ?? ''),
      Granularity: GRANULARITY,
      Metrics: [
        'AmortizedCost',
      ],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
    }))
    .then((result) => result.ResultsByTime?.[0].Groups)
    .then((groups) => groups?.map(utils.transformGroup))
    .then((groups) => groups?.filter(utils.nonZeroGroupOnly))
    .then((groups) => groups?.sort(utils.byAmountDescTaxLast))
    .catch(console.error);
  if (!groups) return;

  const total = groups.reduce((total, group) => total + group.value, 0);
  const message: IncomingWebhookSendArguments = {
    text: `${GRANULARITY === 'DAILY' ? 'Yesterday' : 'Last month'}'s cost was ${utils.round(total, 4)} USD.`,
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

  while (0 < groups.length) {
    message.blocks?.push({
      type: 'section',
      fields: groups.splice(0, 5).reduce(utils.groupsToFields, []),
    });
  }

  await webhook.send(message)
    .then(console.log)
    .catch(console.error);
};
