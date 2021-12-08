import { Context, Callback } from 'aws-lambda';
import axios from 'axios';
import {
  DiscordEventRequest,
  DiscordResponseData,
  getDiscordSecrets,
} from 'discord-bot-cdk-construct';
export async function handler(
  event: DiscordEventRequest,
  context: Context,
  callback: Callback,
): Promise<string> {
  const response = {
    tts: false,
    content: 'Hello world!',
    embeds: [],
    allowed_mentions: [],
  };
  if (
    event.jsonBody.token &&
    (await sendResponse(response, event.jsonBody.token))
  ) {
    console.log('Responded successfully!');
  } else {
    console.log('Failed to send response!');
  }
  return '200';
}
async function sendResponse(
  response: DiscordResponseData,
  interactionToken: string,
): Promise<boolean> {
  const discordSecret = await getDiscordSecrets();
  const authConfig = {
    headers: {
      Authorization: `Bot ${discordSecret?.authToken}`,
    },
  };
  try {
    let url = `https://discord.com/api/v8/webhooks/${discordSecret?.clientId}/${interactionToken}`;
    return (await axios.post(url, response, authConfig)).status == 200;
  } catch (exception) {
    console.log(`There was an error posting a response: ${exception}`);
    return false;
  }
}
