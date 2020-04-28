import https from 'https';
import url from 'url';

export function getInput(name, options = {}) {
  const val = (
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || ''
  ).trim();

  if (options && options.required && val.length === 0) {
    throw new Error(`Input required and not supplied: ${name}`);
  }

  return val;
}

export function printHttpError(errorMessage, statusCode = null, body = null) {
  console.error(
    `ERROR: Unable to post message to Slack${
      errorMessage !== null ? ': ' + errorMessage : ''
    }\n`
  );
  console.error(`Response Code: ${statusCode}`);
  console.error(`Response Body: ${body}`);
}

const doRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        if (response.statusCode !== 200) {
          printHttpError(body, response.statusCode, body);
          process.exit(1);
        }

        try {
          const json = JSON.parse(body);

          if (json.ok) {
            resolve(json);
          } else if (json.error) {
            reject(`Slack Error: ${json.error}`);
          } else {
            reject(`Unable to post message: ${body}`);
          }
        } catch (e) {
          reject(`Unable to parse response body as JSON: ${body}`);
        }
      });
    });

    request.on('error', (error) => {
      printHttpError(error.message || error);
      reject(error.message || error);
      process.exit(1);
    });
    request.write(data);
    request.end();
  });
};

export const postSlackMessage = async (payload) => {
  const data = JSON.stringify(
    Object.assign(payload, {
      token: process.env.SLACK_ACCESS_TOKEN,
    })
  );

  console.log(data);

  const endpoint = url.parse(`https://slack.com/api/chat.postMessage?token=${process.env.SLACK_ACCESS_TOKEN}`);
  const options = {
    hostname: endpoint.hostname,
    port: endpoint.port,
    path: endpoint.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': data.length,
    },
  };

  console.log(options);

  return await doRequest(options, data);
};
