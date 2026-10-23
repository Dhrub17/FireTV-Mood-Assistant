# Mood Assistant for Fire TV

A voice-first viewing assistant. Say how you feel ("I'm exhausted, movie night with the kids, under 20 minutes") and the screen reshapes itself. The assistant shows what it understood as editable chips, explains each pick, and adapts when you say "too slow".

- **App:** React Native for TV (`react-native-tvos`, Expo), targets Fire OS / Android TV.
- **Server:** small Node API. Amazon Bedrock turns speech into structured intent; ranking is deterministic and only returns titles from the real catalog, so it can't invent movies.
- **Works offline of AWS:** without credentials the server uses a rule-based parser, so the demo never breaks.
- **Content:** open-licensed and public-domain titles only (Blender Foundation films, silent classics), with metadata in `app/src/data/catalog.json`.

## Run it

**1. Server**
```bash
cd server && npm install && npm test   # sanity check
npm start                              # rule-based mode, port 8787
# Bedrock mode (needs AWS credentials and model access in your region):
USE_BEDROCK=1 AWS_REGION=us-east-1 BEDROCK_MODEL_ID=<model id you have access to> npm start
```

**2. App** (needs Android Studio with a TV or Fire TV emulator image, or a Fire TV device with ADB debugging on)
```bash
cd app && npm install
npm run prebuild                       # generates the Android TV project
# Emulator: server is reachable at the default http://10.0.2.2:8787
# Real Fire TV: EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8787
npm run android
```

## How it works
1. `Speak` (or a suggestion phrase, or typed text) sends `{text, intent, rejected, shown}` to `POST /assist`.
2. The server merges the new request into the running intent (mood, audience, max length, things to avoid).
3. Ranking picks up to 3 catalog titles with a one-line reason each. Rejected titles stay excluded.
4. The server returns actions (`filter`, `highlight`, `play`) that the app applies to the grid.
5. Tapping a chip removes that part of the intent and re-ranks.

## Known limits
- Voice depends on the device having a speech recognizer. If not, the app reports it and the phrases and keyboard still work. Check the Fire TV docs for Alexa voice button integration if you want the remote's mic button.
- Only 4 of the 9 demo titles have stream URLs; the others show a "no stream" note.
- Screens were typechecked, but you still need to test focus behavior on a real device or emulator.
