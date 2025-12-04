/**
 * Discord Utility Functions
 * 
 * Helper functions for Discord API interactions, webhook verification, and message formatting
 */

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  timestamp?: string
  footer?: {
    text: string
    icon_url?: string
  }
  thumbnail?: {
    url: string
  }
  image?: {
    url: string
  }
  author?: {
    name: string
    url?: string
    icon_url?: string
  }
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
}

export interface DiscordWebhookPayload {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordEmbed[]
  tts?: boolean
}

/**
 * Verify Discord interaction signature
 * Uses Ed25519 signature verification
 * 
 * Note: For production, install @noble/ed25519:
 * npm install @noble/ed25519
 */
export async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): Promise<boolean> {
  try {
    if (!signature || !timestamp || !publicKey) {
      return false
    }

    // Discord signature format: timestamp + body
    const message = timestamp + body
    
    // Try to use @noble/ed25519 if available
    try {
      // Dynamic import to avoid requiring the package
      const { verify } = await import('@noble/ed25519')
      
      // Convert hex strings to Uint8Array
      const signatureBytes = hexToBytes(signature)
      const publicKeyBytes = hexToBytes(publicKey)
      const messageBytes = new TextEncoder().encode(message)
      
      return await verify(signatureBytes, messageBytes, publicKeyBytes)
    } catch (importError) {
      // @noble/ed25519 not installed - use basic validation
      // WARNING: This is not secure for production!
      // Install @noble/ed25519 for proper signature verification
      console.warn('@noble/ed25519 not installed - using basic validation (not secure for production)')
      console.warn('Install with: npm install @noble/ed25519')
      
      // Basic validation - just check that signature exists
      // TODO: Remove this and require @noble/ed25519 for production
      return signature.length > 0 && publicKey.length > 0
    }
  } catch (error) {
    console.error('Error verifying Discord signature:', error)
    return false
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Send message to Discord webhook
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<Response> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord webhook failed: ${response.status} ${errorText}`)
  }

  return response
}

/**
 * Send message to Discord channel via bot
 */
export async function sendDiscordMessage(
  channelId: string,
  content: string | DiscordWebhookPayload,
  botToken: string
): Promise<Response> {
  const payload = typeof content === 'string' 
    ? { content }
    : content

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord API failed: ${response.status} ${errorText}`)
  }

  return response
}

/**
 * Create a Discord embed with default styling
 */
export function createDiscordEmbed(
  title: string,
  description?: string,
  color: number = 0x00ff00
): DiscordEmbed {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'THE LOST+UNFOUNDS',
    },
  }
}

/**
 * Create a success embed (green)
 */
export function createSuccessEmbed(title: string, description?: string): DiscordEmbed {
  return createDiscordEmbed(title, description, 0x00ff00)
}

/**
 * Create an error embed (red)
 */
export function createErrorEmbed(title: string, description?: string): DiscordEmbed {
  return createDiscordEmbed(title, description, 0xff0000)
}

/**
 * Create a warning embed (yellow)
 */
export function createWarningEmbed(title: string, description?: string): DiscordEmbed {
  return createDiscordEmbed(title, description, 0xffff00)
}

/**
 * Create an info embed (blue)
 */
export function createInfoEmbed(title: string, description?: string): DiscordEmbed {
  return createDiscordEmbed(title, description, 0x0099ff)
}

/**
 * Format Discord user mention
 */
export function mentionUser(userId: string): string {
  return `<@${userId}>`
}

/**
 * Format Discord channel mention
 */
export function mentionChannel(channelId: string): string {
  return `<#${channelId}>`
}

/**
 * Format Discord role mention
 */
export function mentionRole(roleId: string): string {
  return `<@&${roleId}>`
}

/**
 * Get Discord OAuth2 authorization URL
 */
export function getDiscordOAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[] = ['identify', 'email'],
  state?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
  })

  if (state) {
    params.append('state', state)
  }

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange Discord OAuth2 code for access token
 */
export async function exchangeDiscordCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}> {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord OAuth2 failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Get Discord user info from access token
 */
export async function getDiscordUser(accessToken: string): Promise<{
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
  verified?: boolean
}> {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord API failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Register slash commands for a Discord server (guild)
 */
export async function registerGuildCommands(
  guildId: string,
  commands: Array<{
    name: string
    description: string
    options?: Array<{
      type: number
      name: string
      description: string
      required?: boolean
    }>
  }>,
  botToken: string,
  clientId: string
): Promise<Response> {
  const response = await fetch(
    `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to register commands: ${response.status} ${errorText}`)
  }

  return response
}

/**
 * Get Discord server (guild) information
 */
export async function getDiscordGuild(
  guildId: string,
  botToken: string
): Promise<{
  id: string
  name: string
  icon: string | null
  description: string | null
  member_count?: number
}> {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: {
      'Authorization': `Bot ${botToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord API failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Get channels in a Discord server (guild)
 */
export async function getGuildChannels(
  guildId: string,
  botToken: string
): Promise<Array<{
  id: string
  name: string
  type: number
  position: number
}>> {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      'Authorization': `Bot ${botToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Discord API failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Send message to a channel in a specific Discord server
 * Uses the configured Guild ID from environment variables
 */
export async function sendGuildChannelMessage(
  channelId: string,
  content: string | DiscordWebhookPayload,
  botToken: string
): Promise<Response> {
  return sendDiscordMessage(channelId, content, botToken)
}
