/**
 * Register Discord Slash Commands
 * 
 * This script registers slash commands for your Discord server.
 * Run with: npx tsx scripts/register-discord-commands.ts
 */

import { registerGuildCommands } from '../lib/discord/utils'

const GUILD_ID = process.env.DISCORD_GUILD_ID || '1428346383772942346'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID

if (!BOT_TOKEN || !CLIENT_ID) {
  console.error('Missing required environment variables:')
  console.error('  - DISCORD_BOT_TOKEN')
  console.error('  - DISCORD_CLIENT_ID')
  console.error('  - DISCORD_GUILD_ID (optional, defaults to configured server)')
  process.exit(1)
}

// Define your slash commands
const commands = [
  {
    name: 'ping',
    description: 'Check if the bot is online',
  },
  {
    name: 'info',
    description: 'Get information about THE LOST+UNFOUNDS',
  },
  {
    name: 'blog',
    description: 'Get information about blog posts',
    options: [
      {
        type: 3, // STRING
        name: 'slug',
        description: 'The blog post slug to look up',
        required: false,
      },
    ],
  },
]

async function main() {
  try {
    console.log(`Registering commands for guild: ${GUILD_ID}`)
    const response = await registerGuildCommands(GUILD_ID, commands, BOT_TOKEN, CLIENT_ID)
    const data = await response.json()
    
    console.log('✅ Commands registered successfully!')
    console.log('Registered commands:')
    data.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`)
    })
  } catch (error: any) {
    console.error('❌ Failed to register commands:', error.message)
    process.exit(1)
  }
}

main()
