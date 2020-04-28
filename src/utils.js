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

export function printHttpError(
  errorMessage,
  statusCode = null,
  body = null
) {
  console.error(
    `ERROR: Unable to post message to Slack${
      errorMessage !== null ? ': ' + errorMessage : ''
    }\n`
  );
  console.error(`Response Code: ${response ? response.statusCode : null}`);
  console.error(`Response Body: ${body}`);
}

export function postSlackMessage(payload) {
  const data = JSON.stringify(
    Object.assign(payload, {
      token: process.env.SLACK_ACCESS_TOKEN,
    })
  );

  console.log(data);

  const endpoint = url.parse('https://slack.com/api/chat.postMessage');
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

  const request = https.request(options, (response) => {
    let buffer = '';

    response.on('data', (chunk) => {
      buffer += chunk;
    });

    response.on('end', () => {
      console.log('status code', response.statusCode);
      if (response.statusCode !== 200) {

        printHttpError(buffer, response.statusCode, buffer);
        process.exit(1);
      }

      console.log('end', buffer);
      //JSON.parse(buffer));
    });
  });

  request.on('error', (error) => {
    printHttpError(error.message);
    process.exit(1);
  });
  request.write(data);
  request.end();
}
