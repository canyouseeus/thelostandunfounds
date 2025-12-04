import { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyDiscordSignature } from '../discord/utils.js'

/**
 * Discord Interactions Handler
 * 
 * Handles Discord slash commands and interactions
 * 
 * POST /api/discord/interactions
 * 
 * This endpoint handles:
 * - Slash commands
 * - Button interactions
 * - Select menu interactions
 * - Modal submissions
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow GET for health checks
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Discord interactions endpoint is active',
      methods: ['POST'],
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const publicKey = process.env.DISCORD_PUBLIC_KEY

    if (!publicKey) {
      return res.status(500).json({
        error: 'Discord public key not configured',
        message: 'Set DISCORD_PUBLIC_KEY environment variable',
      })
    }

    // Verify request signature
    const signature = req.headers['x-signature-ed25519'] as string
    const timestamp = req.headers['x-signature-timestamp'] as string

    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing signature headers' })
    }

    // Get raw body for signature verification
    // Note: Vercel parses JSON automatically, so we need to reconstruct the raw body
    // For proper signature verification, we should use raw body from req
    // For now, we'll stringify the parsed body (this works but is not ideal)
    // TODO: Configure Vercel to pass raw body for this endpoint
    const body = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body)

    // Verify signature
    const isValid = await verifyDiscordSignature(body, signature, timestamp, publicKey)
    
    if (!isValid) {
      console.error('Discord signature verification failed', {
        signature: signature?.substring(0, 20) + '...',
        timestamp,
        bodyLength: body.length,
        publicKeySet: !!publicKey
      })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Handle interaction
    const interaction = typeof req.body === 'object' ? req.body : JSON.parse(body)

    // Handle ping (Discord verification)
    if (interaction.type === 1) {
      return res.status(200).json({ type: 1 })
    }

    // Handle application commands (slash commands)
    if (interaction.type === 2) {
      return handleApplicationCommand(req, res, interaction)
    }

    // Handle message components (buttons, select menus)
    if (interaction.type === 3) {
      return handleMessageComponent(req, res, interaction)
    }

    // Handle modal submissions
    if (interaction.type === 5) {
      return handleModalSubmit(req, res, interaction)
    }

    // Unknown interaction type
    return res.status(400).json({
      error: 'Unknown interaction type',
      type: interaction.type,
    })
  } catch (error: any) {
    console.error('Error handling Discord interaction:', error)
    return res.status(500).json({
      error: 'Interaction handling failed',
      message: error.message,
    })
  }
}

/**
 * Handle application command (slash command)
 */
async function handleApplicationCommand(
  req: VercelRequest,
  res: VercelResponse,
  interaction: any
) {
  const commandName = interaction.data?.name

  // Example commands - customize based on your needs
  switch (commandName) {
    case 'ping':
      return res.status(200).json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: 'Pong! 🏓',
        },
      })

    case 'info':
      return res.status(200).json({
        type: 4,
        data: {
          embeds: [{
            title: 'THE LOST+UNFOUNDS Bot',
            description: 'Welcome to THE LOST+UNFOUNDS Discord bot!',
            color: 0x00ff00,
            fields: [
              {
                name: 'Website',
                value: 'https://thelostandunfounds.com',
                inline: true,
              },
              {
                name: 'Status',
                value: 'Online ✅',
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          }],
        },
      })

    default:
      return res.status(200).json({
        type: 4,
        data: {
          content: `Unknown command: ${commandName}`,
          flags: 64, // EPHEMERAL (only visible to user)
        },
      })
  }
}

/**
 * Handle message component (button, select menu)
 */
async function handleMessageComponent(
  req: VercelRequest,
  res: VercelResponse,
  interaction: any
) {
  const componentType = interaction.data?.component_type
  const customId = interaction.data?.custom_id

  // Handle button clicks
  if (componentType === 2) {
    switch (customId) {
      case 'button_example':
        return res.status(200).json({
          type: 4,
          data: {
            content: 'Button clicked!',
            flags: 64, // EPHEMERAL
          },
        })
    }
  }

  // Handle select menu
  if (componentType === 3) {
    const values = interaction.data?.values || []
    return res.status(200).json({
      type: 4,
      data: {
        content: `Selected: ${values.join(', ')}`,
        flags: 64,
      },
    })
  }

  return res.status(200).json({
    type: 4,
    data: {
      content: 'Component interaction received',
      flags: 64,
    },
  })
}

/**
 * Handle modal submission
 */
async function handleModalSubmit(
  req: VercelRequest,
  res: VercelResponse,
  interaction: any
) {
  const customId = interaction.data?.custom_id
  const components = interaction.data?.components || []

  // Extract form values
  const values: Record<string, string> = {}
  for (const component of components) {
    for (const component2 of component.components || []) {
      if (component2.custom_id && component2.value) {
        values[component2.custom_id] = component2.value
      }
    }
  }

  // Handle different modals
  switch (customId) {
    case 'modal_example':
      return res.status(200).json({
        type: 4,
        data: {
          content: `Form submitted with values: ${JSON.stringify(values)}`,
          flags: 64,
        },
      })
  }

  return res.status(200).json({
    type: 4,
    data: {
      content: 'Modal submitted',
      flags: 64,
    },
  })
}
