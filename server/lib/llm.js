// Amazon Bedrock (Converse API) turns loose speech into structured intent.
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';

export async function understand(text, prev, catalog) {
  const system = `You help someone pick what to watch on a TV. Reply with ONLY compact JSON:
{"reply": string (max 2 short sentences, friendly, spoken style),
 "intent": {"mood"?: one of relaxed|cozy|funny|exciting|emotional|spooky|adventurous|mysterious,
            "audience"?: kids|family|adults, "maxMinutes"?: number, "genres"?: string[], "avoid"?: string[]},
 "rejectShown": boolean (true if the user rejects what was just shown),
 "play": boolean (true if they ask to start playing),
 "matchId": string|null (catalog id if they describe a specific remembered title)}
Merge with previousIntent; keep earlier preferences unless contradicted. Use only mood/genre words found in the catalog.
Catalog: ${JSON.stringify(catalog.map(({ id, title, genres, moods, keywords, description }) => ({ id, title, genres, moods, keywords, description })))}`;
  const res = await client.send(new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: system }],
    messages: [{ role: 'user', content: [{ text: JSON.stringify({ request: text, previousIntent: prev }) }] }],
    inferenceConfig: { maxTokens: 500, temperature: 0.2 },
  }));
  const raw = res.output.message.content[0].text;
  return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}
