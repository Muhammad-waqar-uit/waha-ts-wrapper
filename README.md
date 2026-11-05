# @mukhtasar/waha

TypeScript wrapper for [WAHA](https://github.com/devlikeapro/waha) — the WhatsApp REST API server.

Send messages, manage sessions, read chats, and build bots — fully typed, zero dependencies.

## Install

```bash
npm i @mukhtasar/waha
```

## Quick Start

```typescript
import { createWAHA } from '@mukhtasar/waha';

const waha = createWAHA({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
});

// Send a text message
await waha.sendText({
  chatId: '923095832346@c.us',
  text: 'Hello from WAHA!',
  session: 'waqar',
});

// List chats
const chats = await waha.listChats('waqar');
console.log(chats);

// Get QR code (returns base64 PNG data URL)
const qr = await waha.getQR('waqar', 'image');
console.log(qr); // "data:image/png;base64,iVBORw0KGgo..."

// List sessions
const sessions = await waha.listSessions(true);
```

## Webhook handler (Next.js / any framework)

```typescript
// app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createWAHA } from '@mukhtasar/waha';

const waha = createWAHA({ baseUrl: 'http://localhost:3000', apiKey: process.env.WAHA_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.event !== 'message') return NextResponse.json({ ok: true });

  const msg = body.payload as { fromMe: boolean; body: string; from: string };
  if (msg.fromMe || !msg.body) return NextResponse.json({ ok: true });

  // Your bot logic here
  const answer = 'Thanks for your message!';

  await waha.sendText({
    chatId: msg.from,
    text: answer,
    session: 'waqar',
  });

  return NextResponse.json({ ok: true });
}
```

## API Coverage

| Area | Methods |
|------|---------|
| Sessions | `listSessions`, `getSession`, `createSession`, `updateSession`, `deleteSession`, `startSession`, `stopSession`, `restartSession`, `logoutSession`, `getSessionMe` |
| Auth/QR | `getQR`, `requestCode` |
| Profile | `getProfile`, `setProfileName`, `setProfileStatus`, `setProfilePicture`, `deleteProfilePicture` |
| Chats | `listChats`, `getChatOverview`, `deleteChat`, `getChatPicture`, `archiveChat`, `unarchiveChat`, `markUnread` |
| Messages | `listAllMessages`, `listChatMessages`, `getSingleMessage`, `deleteMessage`, `editMessage`, `pinMessage`, `unpinMessage`, `markChatRead` |
| Send | `sendText`, `sendImage`, `sendFile`, `sendVoice`, `sendVideo`, `sendSticker`, `sendLocation`, `sendContact`, `sendPoll` |
| Interactive | `startTyping`, `stopTyping`, `sendSeen`, `sendReaction`, `starMessage`, `forwardMessage`, `reply`, `sendLinkPreview`, `sendCustomLinkPreview` |
| UI | `sendButtons`, `sendList`, `sendPollVote`, `sendButtonReply` |
| Groups | `createGroup` |
| Channels | `listChannels`, `createChannel`, `getChannel`, `deleteChannel`, `followChannel`, `unfollowChannel`, `getChannelMessages` |
| Calls | `rejectCall` |
| Misc | `checkNumberStatus`, `generateMessageId`, `listApiKeys`, `createApiKey`, `updateApiKey`, `deleteApiKey` |

## Types

All inputs and outputs are fully typed. Key types exported:

- `WahaOptions` — constructor options
- `SessionInfo`, `SessionCreateRequest`, `SessionDTO` — session shapes
- `ChatSummary`, `WAMessage`, `Channel`, `MeInfo`, `MyProfile` — data shapes
- `SendTextOptions`, `SendImageOptions`, `SendFileOptions`, etc. — send params
- `ChatQueryParams`, `MessageQueryParams` — list/query filters
- `WahaError` — thrown on non-OK responses

## Notes

- WAHA must be running locally or reachable via `baseUrl`.
- The `apiKey` header (`X-Api-Key`) is optional but recommended.
- `timeoutMs` defaults to 30s. Set higher for media-heavy operations.
- No external dependencies beyond Node 18+.

## License

MIT
