import * as github from '@actions/github';

export const getMessageText = () => {
  const { url } = github.context.payload.repository;
  const { GITHUB_REPOSITORY } = process.env;

  return `*<${url}|${GITHUB_REPOSITORY}>*`;
};

export const getJobSummaryBlocks = (workflowSummary) => {
  const rows = [];

  workflowSummary.jobs.forEach((job) => {
    // Reference
    // =========
    // conclusion: null, success, failure, neutral, cancelled, timed_out or action_required
    // status: queued, in_progress, completed

    let actionStep;
    let totalCompleted = 0;

    outerLoop:
    for (let i = 0; i < job.steps.length; i += 1) {
      actionStep = job.steps[i];
      switch (actionStep.status) {
        case 'completed':
          totalCompleted += 1;
          break outerLoop;

        case 'in_progress':
          break outerLoop;

        case 'queued':
        default:
          break;
      }
    }


    switch (job.status) {
      case 'in_progress':
        rows.push(
          `:hourglass_flowing_sand:  *<${job.url}|${job.name}>*:  ${actionStep.name}  _(In progress [${totalCompleted} of ${job.steps.length} complete])_`
        );
        break;

      case 'queued':
        rows.push(
          `:timer_clock:  *<${job.url}|${job.name}>*:  ${actionStep.name}  _(Queued)_`
        );
        break;

      case 'completed':
        switch (job.conclusion) {
          case 'success':
            rows.push(
              `:heavy_check_mark:  *<${job.url}|${job.name}>*:  ${totalCompleted} of ${job.steps.length} completed successfully`
            );
            break;

          case 'failure':
            rows.push(
              `:x:  *<${job.url}|${job.name}>*:  ${actionStep.name}  _(Completed)_`
            );
            break;

          case 'neutral':
            rows.push(
              `:white_check_mark:  *<${job.url}|${job.name}>*:  ${totalCompleted} of ${job.steps.length} completed _(neutral)_`
            );
            break;

          case 'cancelled':
            rows.push(
              `:x:  *<${job.url}|${job.name}>*:  _(Cancelled [${totalCompleted} of ${job.steps.length} completed])_`
            );
            break;

          case 'timed_out':
            rows.push(
              `:x:  *<${job.url}|${job.name}>*:  ${actionStep.name}  _(Timed out [${totalCompleted} of ${job.steps.length} completed])_`
            );
            break;

          case 'action_required':
            rows.push(
              `:exclamation:  *<${job.url}|${job.name}>*:  ${actionStep.name}  _(Manual Action Required)_`
            );
            break;
        }
        break;

      default:
        throw new Error(`Unknown job status: ${job.status}`);
    }
  });

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: rows.join('\n'),
      },
    },
  ];
};

export const getEventSummaryBlocks = () => {
  const {
    context: {
      eventName,
      ref,
      workflow,
      payload: {
        repository: { url },
      },
    },
  } = github;
  const { GITHUB_RUN_ID } = process.env;

  const fields = [
    `*Workflow*: <${url}/actions/runs/${GITHUB_RUN_ID}|${workflow}>`,
    '*Event*: `' + eventName + '`',
  ];

  if (eventName === 'push') {
    fields.push('*Branch*: `' + ref.trim('/').replace('refs/heads/', '') + '`');
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: fields.join('     '),
      },
    },
  ];
};

export const getCommitBlocks = () => {
  const {
    context: { eventName, payload },
  } = github;

  const blocks = [];

  if (eventName === 'push') {
    const maxCommits = 2;
    let index = 0;

    payload.commits
      .reverse()
      .slice(0, maxCommits)
      .forEach((commit) => {
        index += 1;

        const {
          id,
          url,
          message,
          author: { username },
        } = commit;

        if (index > 1) {
          blocks.push(getDividerBlock());
        }

        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*<${url}|${id.substring(0, 7)}>*: ${message}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'image',
                image_url: `https://github.com/${username}.png`,
                alt_text: username,
              },
              {
                type: 'mrkdwn',
                text: `*<https://github.com/${username}|${username}>*`,
              },
            ],
          }
        );
      });

    if (payload.commits.length > maxCommits) {
      const extra = payload.commits.length - maxCommits;
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Plus *${extra}* more ${extra === 1 ? 'commit' : 'commits'}`,
          },
        ],
      });
    }
  }

  return blocks;
};

export const getDividerBlock = () => {
  return {
    type: 'divider',
  };
};
