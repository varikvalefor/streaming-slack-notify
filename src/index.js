import https from 'https';
import url from 'url';
import * as core from '@actions/core';
import * as github from '@actions/github';

const notRequired = { required: false };

async function run() {
  try {
    if (!process.env.SLACK_WEBHOOK) {
      throw new Error(
        'No SLACK_WEBHOOK secret defined. Navigate to Repository > Settings > Secrets and add SLACK_WEBHOOK secret'
      );
    }

    // Build the payload
    const payload = {
      // By default, the channel, username, icon_url are required in the Slack Webhook URL.
      // Any values specified by the user just override the defaults.
      channel: core.getInput('channel', notRequired),
      username: core.getInput('username', notRequired),
      icon_url: core.getInput('icon_url', notRequired),
    };

    /*
    let attachment = {};
    attachment.fallback = core.getInput('fallback', {
      required: false,
    });
    attachment.color = core.getInput('color', {
      required: false,
    });
    attachment.pretext = core.getInput('pretext', {
      required: false,
    });
    attachment.author_name = core.getInput('author_name', {
      required: false,
    });
    attachment.author_link = core.getInput('author_link', {
      required: false,
    });
    attachment.author_icon = core.getInput('author_icon', {
      required: false,
    });
    attachment.title = core.getInput('title', {
      required: false,
    });
    attachment.title_link = core.getInput('title_link', {
      required: false,
    });
    attachment.text = core.getInput('text', {
      required: false,
    });
    attachment.image_url = core.getInput('image_url', {
      required: false,
    });
    attachment.thumb_url = core.getInput('thumb_url', {
      required: false,
    });
    attachment.footer = core.getInput('footer', {
      required: false,
    });
    attachment.footer_icon = core.getInput('footer_icon', {
      required: false,
    });

    //console.log('>>>', process.env);
    console.log('context', github.context);
    */

    const data = JSON.stringify(payload);
    const endpoint = url.parse(process.env.SLACK_WEBHOOK);
    const options = {
      hostname: endpoint.hostname,
      port: endpoint.port,
      path: endpoint.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };


    const request = https.request(options, (response) => {
      console.log(`statusCode: ${response.statusCode}`);
      let buffer = '';

      response.on('data', (chunk) => {
        buffer += chunk;
        console.log('chunk', chunk);
      });

      // The whole response has been received.
      response.on('end', () => {
        console.log('end', buffer);
        //JSON.parse(buffer));
      });
    });

    request.on('error', (error) => {
      console.error('error1', error);
    });
    request.write(data);
    request.end();



    /*
    https.post(
      process.env.SLACK_WEBHOOK,
      {
        form: {
          payload: JSON.stringify(payload),
        },
      },
      (err, response) => {
        if (err) {
          console.log('---------error22--------A');
          console.log(err);
          console.log('---------error22--------E');
          throw new Error(err);
        }
        if (response.body !== 'ok') {
          console.log('---------error333--------A');
          console.log(err);
          console.log('---------error333--------E');
          throw new Error(response.body);
        }

        console.log('good', response);
      }
    ); */

    /*
    slack.onError = (err) => {
      core.error(`ERROR: ${err}  Action may still succeed though`);
    };

    const response = slack.send({
      text: `Github action (${process.env.GITHUB_WORKFLOW}) triggered\n`,
      attachments: [
        {
          // Opinionated attachment / status
          title: `${process.env.GITHUB_REPOSITORY}`,
          title_link: `https://github.com/${process.env.GITHUB_REPOSITORY}`,
          author_name: `${process.env.GITHUB_ACTOR}`,
          author_link: `https://github.com/${process.env.GITHUB_ACTOR}`,
          author_icon: `https://github.com/${process.env.GITHUB_ACTOR}.png`,

          // color: attachment.color,
          text: `${process.env.GITHUB_REF}`,
          footer: `action -> ${process.env.GITHUB_EVENT_NAME}`,
          thumb_url:
            'https://avatars0.githubusercontent.com/u/44036562?s=200&v=4',
        },
      ],
    }); */
  } catch (error) {
    console.log('---------error--------A');
    console.log(error);
    console.log('---------error--------E');
    core.setFailed(error.message);
  }
}

run();
