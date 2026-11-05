export interface WahaOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface SessionInfo {
  name: string;
  state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'STOPPED';
  pairingCode?: string;
  [key: string]: unknown;
}

export interface SessionCreateRequest {
  name: string;
  engine?: 'NOWEB' | 'WEB' | 'BAIL' | 'E2E';
  webhookUrl?: string;
  webhookEvents?: string[];
  hooks?: Record<string, unknown>;
}

export interface SessionDTO extends SessionInfo {
  // WAHA returns extra fields
}

export interface ChatSummary {
  id: string;
  timestamp?: number;
  messages?: WAMessage[];
  unreadCount?: number;
  [key: string]: unknown;
}

export interface WAMessage {
  id: string;
  chatId: string;
  from: string;
  fromMe: boolean;
  body: string | null;
  timestamp: number;
  type?: string;
  mediaUrl?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  ack?: number;
  [key: string]: unknown;
}

export interface Channel {
  id: string;
  name: string;
  invite?: string;
  role?: 'admin' | 'member' | 'groupphoto';
  pictureUrl?: string;
  description?: string;
  [key: string]: unknown;
}

export interface MeInfo {
  id: string;
  pushName?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

export interface MyProfile {
  id: string;
  name?: string;
  status?: string;
  pictureUrl?: string;
  [key: string]: unknown;
}

export interface SendTextOptions {
  chatId: string;
  text: string;
  session?: string;
  quotedMsgId?: string;
  mentions?: string[];
}

export interface SendImageOptions {
  chatId: string;
  media: string | Buffer; // URL or base64
  caption?: string;
  session?: string;
  mimetype?: string;
  quotedMsgId?: string;
}

export interface SendFileOptions {
  chatId: string;
  media: string | Buffer;
  mimetype?: string;
  filename?: string;
  session?: string;
  quotedMsgId?: string;
}

export interface SendVoiceOptions {
  chatId: string;
  media: string | Buffer;
  session?: string;
  quotedMsgId?: string;
}

export interface SendVideoOptions {
  chatId: string;
  media: string | Buffer;
  caption?: string;
  session?: string;
  quotedMsgId?: string;
  mimetype?: string;
}

export interface SendLocationOptions {
  chatId: string;
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  session?: string;
}

export interface SendContactOptions {
  chatId: string;
  contacts: Array<{ name: string; phone: string }>;
  session?: string;
}

export interface SendPollOptions {
  chatId: string;
  name: string;
  values: string[];
  session?: string;
}

export interface SendReactionOptions {
  messageId: string;
  chatId: string;
  reaction: string;
  session?: string;
}

export interface SendSeenOptions {
  chatId: string;
  session?: string;
}

export interface MessageForwardOptions {
  messageId: string;
  chatId: string;
  session?: string;
}

export interface MessageReplyOptions {
  chatId: string;
  text: string;
  messageToReply: string; // parent message ID
  session?: string;
}

export interface MessageEditOptions {
  messageId: string;
  chatId: string;
  text: string;
  session?: string;
}

export interface PinMessageOptions {
  messageId: string;
  chatId: string;
  pinned: boolean;
  session?: string;
}

export interface StartTypingOptions {
  chatId: string;
  session?: string;
}

export interface ChatQueryParams {
  sortBy?: 'timestamp' | 'id';
  sortOrder?: 'asc' | 'desc';
  merge?: boolean;
  limit?: number;
  offset?: number;
  ids?: string;
}

export interface MessageQueryParams {
  sortBy?: 'timestamp' | 'id';
  sortOrder?: 'asc' | 'desc';
  downloadMedia?: boolean;
  downloadMediaMimetypes?: string[];
  merge?: boolean;
  limit?: number;
  offset?: number;
  filterTimestampLte?: number;
  filterTimestampGte?: number;
  filterFromMe?: boolean;
  filterAck?: number;
}

export interface ApiKeyRequest {
  name: string;
  control?: boolean;
  media?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface SessionUpdateRequest {
  name?: string;
  [key: string]: unknown;
}

export class WahaError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'WahaError';
  }
}

export class WAHA {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: WahaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.extraHeaders = options.headers ?? {};
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.extraHeaders,
    };
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
        signal: controller.signal,
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : undefined;

      if (!res.ok) {
        throw new WahaError(res.status, data?.message ?? data?.error ?? res.statusText, data);
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async listSessions(expand = false): Promise<SessionInfo[]> {
    const qs = expand ? '?expand=all' : '';
    return this.request<SessionInfo[]>(`/api/sessions${qs}`);
  }

  async getSession(session: string, expand = false): Promise<SessionInfo> {
    const qs = expand ? '?expand=all' : '';
    return this.request<SessionInfo>(`/api/sessions/${encodeURIComponent(session)}${qs}`);
  }

  async createSession(req: SessionCreateRequest): Promise<SessionDTO> {
    return this.request<SessionDTO>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updateSession(session: string, req: SessionUpdateRequest): Promise<SessionDTO> {
    return this.request<SessionDTO>(`/api/sessions/${encodeURIComponent(session)}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  }

  async deleteSession(session: string): Promise<void> {
    await this.request<void>(`/api/sessions/${encodeURIComponent(session)}`, {
      method: 'DELETE',
    });
  }

  async startSession(session: string): Promise<SessionDTO> {
    return this.request<SessionDTO>(`/api/sessions/${encodeURIComponent(session)}/start`, {
      method: 'POST',
    });
  }

  async stopSession(session: string): Promise<SessionDTO> {
    return this.request<SessionDTO>(`/api/sessions/${encodeURIComponent(session)}/stop`, {
      method: 'POST',
    });
  }

  async restartSession(session: string): Promise<SessionDTO> {
    return this.request<SessionDTO>(`/api/sessions/${encodeURIComponent(session)}/restart`, {
      method: 'POST',
    });
  }

  async logoutSession(session: string): Promise<SessionDTO> {
    return this.request<SessionDTO>(`/api/sessions/${encodeURIComponent(session)}/logout`, {
      method: 'POST',
    });
  }

  async getSessionMe(session: string): Promise<MeInfo> {
    return this.request<MeInfo>(`/api/sessions/${encodeURIComponent(session)}/me`);
  }

  async getCapping(session: string): Promise<unknown> {
    return this.request(`/api/sessions/${encodeURIComponent(session)}/capping`);
  }

  async getTimelock(session: string): Promise<unknown> {
    return this.request(`/api/sessions/${encodeURIComponent(session)}/timelock`);
  }

  // ─── QR / Auth ───────────────────────────────────────────────────────────────

  async getQR(session: string, format: 'image' | 'raw' = 'image'): Promise<string | Record<string, unknown>> {
    const url = `/api/${encodeURIComponent(session)}/auth/qr?format=${format}`;
    if (format === 'image') {
      // Return blob as base64 data URL
      const res = await fetch(`${this.baseUrl}${url}`, {
        headers: this.apiKey ? { 'X-Api-Key': this.apiKey } : {},
      });
      if (!res.ok) throw new WahaError(res.status, res.statusText);
      const buf = Buffer.from(await res.arrayBuffer());
      const b64 = buf.toString('base64');
      return `data:image/png;base64,${b64}`;
    }
    return this.request<Record<string, unknown>>(url);
  }

  async requestCode(session: string, phoneNumber: string): Promise<Record<string, unknown>> {
    return this.request(`/api/${encodeURIComponent(session)}/auth/request-code`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(session: string): Promise<MyProfile> {
    return this.request<MyProfile>(`/api/${encodeURIComponent(session)}/profile`);
  }

  async setProfileName(session: string, name: string): Promise<Record<string, unknown>> {
    return this.request(`/api/${encodeURIComponent(session)}/profile/name`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async setProfileStatus(session: string, status: string): Promise<Record<string, unknown>> {
    return this.request(`/api/${encodeURIComponent(session)}/profile/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async setProfilePicture(session: string, picture: string): Promise<Record<string, unknown>> {
    return this.request(`/api/${encodeURIComponent(session)}/profile/profile/picture`, {
      method: 'PUT',
      body: JSON.stringify({ picture }),
    });
  }

  async deleteProfilePicture(session: string): Promise<void> {
    await this.request<void>(`/api/${encodeURIComponent(session)}/profile/picture`, {
      method: 'DELETE',
    });
  }

  // ─── Chats ───────────────────────────────────────────────────────────────────

  async listChats(session: string, params?: ChatQueryParams): Promise<ChatSummary[]> {
    const qs = new URLSearchParams();
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params?.merge !== undefined) qs.set('merge', String(params.merge));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.ids) qs.set('ids', params.ids);
    const query = qs.toString();
    return this.request<ChatSummary[]>(
      `/api/${encodeURIComponent(session)}/chats${query ? `?${query}` : ''}`
    );
  }

  async getChatOverview(session: string, params?: Omit<ChatQueryParams, 'sortBy' | 'sortOrder'>): Promise<ChatSummary[]> {
    const qs = new URLSearchParams();
    if (params?.merge !== undefined) qs.set('merge', String(params.merge));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.ids) qs.set('ids', params.ids);
    const query = qs.toString();
    return this.request<ChatSummary[]>(
      `/api/${encodeURIComponent(session)}/chats/overview${query ? `?${query}` : ''}`
    );
  }

  async deleteChat(session: string, chatId: string): Promise<void> {
    await this.request<void>(`/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
    });
  }

  async getChatPicture(session: string, chatId: string, refresh = false): Promise<{ url: string }> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/picture${refresh ? '?refresh=true' : ''}`
    );
  }

  async archiveChat(session: string, chatId: string): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/archive`,
      { method: 'POST' }
    );
  }

  async unarchiveChat(session: string, chatId: string): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/unarchive`,
      { method: 'POST' }
    );
  }

  async markUnread(session: string, chatId: string): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/unread`,
      { method: 'POST' }
    );
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  async listAllMessages(params?: MessageQueryParams): Promise<WAMessage[]> {
    const qs = new URLSearchParams();
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params?.downloadMedia !== undefined) qs.set('downloadMedia', String(params.downloadMedia));
    if (params?.downloadMediaMimetypes) qs.set('downloadMediaMimetypes', params.downloadMediaMimetypes.join(','));
    if (params?.merge !== undefined) qs.set('merge', String(params.merge));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.filterTimestampLte) qs.set('filter.timestamp.lte', String(params.filterTimestampLte));
    if (params?.filterTimestampGte) qs.set('filter.timestamp.gte', String(params.filterTimestampGte));
    if (params?.filterFromMe !== undefined) qs.set('filter.fromMe', String(params.filterFromMe));
    if (params?.filterAck !== undefined) qs.set('filter.ack', String(params.filterAck));
    const query = qs.toString();
    return this.request<WAMessage[]>(`/api/messages${query ? `?${query}` : ''}`);
  }

  async listChatMessages(
    session: string,
    chatId: string,
    params?: Pick<MessageQueryParams, 'sortBy' | 'sortOrder' | 'downloadMedia' | 'merge' | 'limit' | 'offset' | 'filterTimestampLte' | 'filterTimestampGte' | 'filterFromMe' | 'filterAck'>
  ): Promise<WAMessage[]> {
    const qs = new URLSearchParams();
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params?.downloadMedia !== undefined) qs.set('downloadMedia', String(params.downloadMedia));
    if (params?.merge !== undefined) qs.set('merge', String(params.merge));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.filterTimestampLte) qs.set('filter.timestamp.lte', String(params.filterTimestampLte));
    if (params?.filterTimestampGte) qs.set('filter.timestamp.gte', String(params.filterTimestampGte));
    if (params?.filterFromMe !== undefined) qs.set('filter.fromMe', String(params.filterFromMe));
    if (params?.filterAck !== undefined) qs.set('filter.ack', String(params.filterAck));
    const query = qs.toString();
    return this.request<WAMessage[]>(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages${query ? `?${query}` : ''}`
    );
  }

  async getSingleMessage(
    session: string,
    chatId: string,
    messageId: string,
    downloadMedia = false
  ): Promise<WAMessage> {
    const qs = new URLSearchParams({ downloadMedia: String(downloadMedia) });
    return this.request<WAMessage>(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?${qs}`
    );
  }

  async deleteMessage(session: string, chatId: string, messageId: string): Promise<void> {
    await this.request<void>(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
      { method: 'DELETE' }
    );
  }

  async editMessage(
    session: string,
    chatId: string,
    messageId: string,
    text: string
  ): Promise<WAMessage> {
    return this.request<WAMessage>(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ text }),
      }
    );
  }

  async pinMessage(session: string, chatId: string, messageId: string, pinned = true): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
      {
        method: 'POST',
        body: JSON.stringify({ pinned }),
      }
    );
  }

  async unpinMessage(session: string, chatId: string, messageId: string): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/unpin`,
      { method: 'POST' }
    );
  }

  async markChatRead(session: string, chatId: string, days = 1): Promise<unknown> {
    return this.request(
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/read?days=${days}`,
      { method: 'POST' }
    );
  }

  // ─── Send Methods ────────────────────────────────────────────────────────────

  async sendText(data: SendTextOptions): Promise<WAMessage> {
    return this.request<WAMessage>('/api/sendText', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendImage(data: SendImageOptions): Promise<unknown> {
    return this.request('/api/sendImage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendFile(data: SendFileOptions): Promise<unknown> {
    return this.request('/api/sendFile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendVoice(data: SendVoiceOptions): Promise<unknown> {
    return this.request('/api/sendVoice', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendVideo(data: SendVideoOptions): Promise<unknown> {
    return this.request('/api/sendVideo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendSticker(data: { chatId: string; media: string | Buffer; session?: string }): Promise<unknown> {
    return this.request('/api/sendSticker', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendLocation(data: SendLocationOptions): Promise<unknown> {
    return this.request('/api/sendLocation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendContact(data: SendContactOptions): Promise<unknown> {
    return this.request('/api/sendContactVcard', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendPoll(data: SendPollOptions): Promise<unknown> {
    return this.request('/api/sendPoll', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Interactive ─────────────────────────────────────────────────────────────

  async startTyping(data: StartTypingOptions): Promise<unknown> {
    return this.request('/api/startTyping', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stopTyping(data: StartTypingOptions): Promise<unknown> {
    return this.request('/api/stopTyping', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendSeen(data: SendSeenOptions): Promise<unknown> {
    return this.request('/api/sendSeen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendReaction(data: SendReactionOptions): Promise<unknown> {
    return this.request('/api/reaction', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async starMessage(session: string, chatId: string, messageId: string, starred = true): Promise<unknown> {
    return this.request('/api/star', {
      method: 'PUT',
      body: JSON.stringify({ messageId, chatId, session, starred }),
    });
  }

  async forwardMessage(data: MessageForwardOptions): Promise<WAMessage> {
    return this.request<WAMessage>('/api/forwardMessage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reply(data: MessageReplyOptions): Promise<unknown> {
    return this.request('/api/reply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendLinkPreview(data: { chatId: string; url: string; session?: string }): Promise<unknown> {
    return this.request('/api/sendLinkPreview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendCustomLinkPreview(data: {
    chatId: string;
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    session?: string;
  }): Promise<unknown> {
    return this.request('/api/send/link-custom-preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Buttons & Lists ─────────────────────────────────────────────────────────

  async sendButtons(data: {
    chatId: string;
    title: string;
    description?: string;
    footer?: string;
    buttons: Array<{ id: string; title: string }>;
    session?: string;
  }): Promise<unknown> {
    return this.request('/api/sendButtons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendList(data: {
    chatId: string;
    title: string;
    description?: string;
    footer?: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
    session?: string;
  }): Promise<unknown> {
    return this.request('/api/sendList', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendPollVote(data: { pollChatId: string; pollMessageId: string; selectedOptions: string[]; session?: string }): Promise<unknown> {
    return this.request('/api/sendPollVote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendButtonReply(data: { buttonId: string; chatId: string; sessionId?: string; session?: string }): Promise<unknown> {
    return this.request('/api/send/buttons/reply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Groups ──────────────────────────────────────────────────────────────────

  async createGroup(session: string, name: string, participants: string[]): Promise<unknown> {
    return this.request(`/api/${encodeURIComponent(session)}/groups`, {
      method: 'POST',
      body: JSON.stringify({ name, participants }),
    });
  }

  // ─── Channels ────────────────────────────────────────────────────────────────

  async listChannels(session: string, role?: 'admin' | 'member'): Promise<Channel[]> {
    const qs = role ? `?role=${role}` : '';
    return this.request<Channel[]>(`/api/${encodeURIComponent(session)}/channels${qs}`);
  }

  async createChannel(session: string, name: string, description?: string): Promise<Channel> {
    return this.request<Channel>(`/api/${encodeURIComponent(session)}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getChannel(session: string, channelId: string): Promise<Channel> {
    return this.request<Channel>(`/api/${encodeURIComponent(session)}/channels/${encodeURIComponent(channelId)}`);
  }

  async deleteChannel(session: string, channelId: string): Promise<void> {
    await this.request<void>(`/api/${encodeURIComponent(session)}/channels/${encodeURIComponent(channelId)}`, {
      method: 'DELETE',
    });
  }

  async followChannel(session: string, channelId: string): Promise<void> {
    await this.request<void>(`/api/${encodeURIComponent(session)}/channels/${encodeURIComponent(channelId)}/follow`, {
      method: 'POST',
    });
  }

  async unfollowChannel(session: string, channelId: string): Promise<void> {
    await this.request<void>(`/api/${encodeURIComponent(session)}/channels/${encodeURIComponent(channelId)}/unfollow`, {
      method: 'POST',
    });
  }

  async getChannelMessages(
    session: string,
    channelId: string,
    opts?: { limit?: number; downloadMedia?: boolean; downloadMediaMimetypes?: string[] }
  ): Promise<unknown[]> {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.downloadMedia !== undefined) qs.set('downloadMedia', String(opts.downloadMedia));
    if (opts?.downloadMediaMimetypes) qs.set('downloadMediaMimetypes', opts.downloadMediaMimetypes.join(','));
    const query = qs.toString();
    return this.request(
      `/api/${encodeURIComponent(session)}/channels/${encodeURIComponent(channelId)}/messages/preview${query ? `?${query}` : ''}`
    );
  }

  // ─── Calls ───────────────────────────────────────────────────────────────────

  async rejectCall(session: string, callId: string, caller: string): Promise<void> {
    return this.request(`/api/${encodeURIComponent(session)}/calls/reject`, {
      method: 'POST',
      body: JSON.stringify({ callId, caller }),
    });
  }

  // ─── Check Numbers ───────────────────────────────────────────────────────────

  async checkNumberStatus(phone: string, session?: string): Promise<unknown> {
    const qs = session ? `?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(session)}` : `?phone=${encodeURIComponent(phone)}`;
    return this.request(`/api/checkNumberStatus${qs}`);
  }

  // ─── API Keys ────────────────────────────────────────────────────────────────

  async listApiKeys(): Promise<unknown[]> {
    return this.request<unknown[]>('/api/keys');
  }

  async createApiKey(req: ApiKeyRequest): Promise<unknown> {
    return this.request('/api/keys', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async createMediaApiKey(req: { name: string }): Promise<unknown> {
    return this.request('/api/keys/media', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async createControlApiKey(req: { name: string }): Promise<unknown> {
    return this.request('/api/keys/control', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async updateApiKey(id: string, req: ApiKeyRequest): Promise<unknown> {
    return this.request(`/api/keys/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.request<void>(`/api/keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  async generateMessageId(session: string): Promise<string> {
    const res = await this.request<{ id: string }>(`/api/${encodeURIComponent(session)}/new-message-id`);
    return res.id;
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────

export function createWAHA(options: WahaOptions): WAHA {
  return new WAHA(options);
}
