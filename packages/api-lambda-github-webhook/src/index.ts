import { createHmac, timingSafeEqual } from 'crypto';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { InstallationEvent, WorkflowRunEvent } from '@octokit/webhooks-definitions/schema';
import {
  deleteGitHubRecordById,
  getGithubRecordById,
  updateGithubAppRecordFromWebhook,
} from '../../common/lib/dynamodb';
import { BaseError, ValidationError } from '../../common/lib/errors';
import { getGitHubAppWebhookSecret } from '../../common/lib/ssm';

const init = async (): Promise<string> => {
  return new Promise((resolve) => {
    resolve(getGitHubAppWebhookSecret());
  });
};
const initPromise: Promise<string> = init();

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  let statusCode = 200;
  const responseBody = {
    ok: true,
  };

  try {
    if (event.body === undefined) {
      throw new ValidationError('No post data received');
    }

    // Ensure some basic Github headers
    const { headers } = event;

    if (headers['x-github-event'] === undefined) {
      throw new ValidationError('No valid "x-github-event" header specified');
    }

    if (headers['x-hub-signature'] === undefined) {
      throw new ValidationError('No valid "x-hub-signature" header specified');
    }

    console.log('Verifying GitHub webhook signature ...');
    const hmac = createHmac('sha1', await initPromise);
    const digest = Buffer.from('sha1=' + hmac.update(event.body).digest('hex'), 'utf8');
    const checksum = Buffer.from(headers['x-hub-signature'], 'utf8');

    if (checksum.length !== digest.length || !timingSafeEqual(digest, checksum)) {
      throw new Error(`Request body digest (${digest}) did not match x-hub-signature (${checksum})`);
    }

    console.log('Received webhook:', new Date().toISOString(), headers['x-github-event'], event.body);

    // Good, signature verified. We store the installation ID alongside the owner such that we can quickly
    // retrieve the installation ID and verify synchronization between owner and installation ID.

    switch (headers['x-github-event']) {
      case 'installation':
        {
          const body = JSON.parse(event.body) as InstallationEvent;
          const {
            action, // "created", "deleted", "new_permissions_accepted", "suspend", "unsuspend"
            installation: {
              id: installationId,
              account: { login: owner, type, id: accountId },
            },
            sender: { login: senderLogin, id: senderId },
          } = body;

          console.log('Handling webhook event:', headers['x-github-event'], 'Action:', action);

          switch (action) {
            case 'deleted':
              await deleteGitHubRecordById(installationId);
              break;
            default:
              await updateGithubAppRecordFromWebhook(installationId, owner, type, accountId, senderLogin, senderId);
              break;
          }
        }
        break;

      case 'workflow_run':
        {
          let body = JSON.parse(event.body) as WorkflowRunEvent;
          switch (body.action) {
            case 'requested': // WorkflowRunRequestedEvent
              // Git the record by id
              if (!body.installation || !body.installation.id) {
                throw new Error('No installation ID associated with event. Ignoring');
              }
              console.log('Retrieving GitHub record by ID ...');
              const record = await getGithubRecordById(body.installation.id);
              if (!record.Item) {
                throw new Error(`Unable to find linked Slack/GitHub using installation ID: ${body.installation.id}`);
              }
              break;

            case 'completed': // WorkflowRunCompletedEvent
              break;
          }
        }
        break;

      default:
        console.log('Ignoring event');
        break;
    }
  } catch (error) {
    // Log the full error in CloudWatch
    console.error(error);

    if (error instanceof BaseError) {
      statusCode = error.getStatusCode();
      responseBody.ok = false;
    } else {
      console.debug('Resetting return status code to 200 even though an error occurred');
      statusCode = 200;
    }

    console.error('Returning with statusCode: ' + statusCode);
  }

  return {
    statusCode,
    isBase64Encoded: false,
    headers: {
      Server: 'TechPivot',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responseBody),
  };
};
