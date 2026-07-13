# Discord Bot Template

# Mysql Prisma install

1. Install Prisma
   ```
   npm install prisma @prisma/client @prisma/adapter-mariadb
   npx prisma init --datasource-provider mysql --output ../generated/prisma
   ```

2. Change .env file
   ```
   DATABASE_USER="username"
   DATABASE_PASSWORD="password"
   DATABASE_NAME="mydb"
   DATABASE_HOST="localhost"
   DATABASE_PORT=3306
   ```

3. Create or update database tables directly from the Prisma schema
   ```
   npx prisma db push
   ```

   If the database already contains tables and you want to update
   `schema.prisma` from those tables instead, run
   ```
   npx prisma db pull
   ```

   To create migration files during development, run
   ```
   npx prisma migrate dev --name init
   ```

   `prisma migrate dev` creates a temporary shadow database. The configured
   database user must have permission to create databases, or Prisma must be
   configured with a dedicated shadow database. Use `prisma db push` when you
   only need to apply the schema to an existing database and do not need
   migration files.

4. Generate the Prisma client
   ```
   npx prisma generate
   ```

5. Use Prisma
   ```js
   import { PrismaClient } from './generated/prisma/client.ts';
   import { PrismaMariaDb } from '@prisma/adapter-mariadb';

   const apdapter = new PrismaMariaDb({
       host: process.env.DATABASE_HOST,
       port: process.env.DATABASE_PORT,
       user: process.env.DATABASE_USER,
       password: process.env.DATABASE_PASSWORD,
       database: process.env.DATABASE_NAME
   })

   const prisma = new PrismaClient({ adapter: apdapter })
   ```

# Project architecture

This repository is a Discord.js bot template with a small filesystem-based framework. Files and folder names are part of the runtime contract: the loaders discover commands, event handlers, and component triggers without a central registry.

## Runtime overview

```text
index.js
  -> validate command filenames
  -> create MyClient and its command Collection
  -> discover top-level commands and root command folders
  -> discover component triggers
  -> attach every module from events/ and utils/ as a Discord event listener
  -> log in to Discord

Discord InteractionCreate
  -> interactionCommands.js for slash commands and autocomplete
  -> interactionPage.js for custom IDs beginning with page:<number>_
  -> interactionTrigger.js for ordinary buttons and modal submissions
```

`utils/myClient.js` defines the Discord client and gateway intents. `index.js` is the composition root: it constructs this client, fills `client.commands`, attaches event listeners, installs process-level error logging, and calls `client.login()`.

Several files can listen to the same Discord event. Each listener must therefore check the interaction type or custom-ID pattern immediately and return when the event does not belong to it.

## Command framework

The first folder below `commands/` is a category, not part of the Discord slash-command path:

```text
commands/
  tools/                       category
    ping.js                    /ping
    [server]/                  /server root command
      index.js                 root schema and leaf dispatcher
      status.js                /server status
      [member]/                subcommand group
        index.js               group schema
        inspect.js             /server member inspect
  admin/                       protected command category
    admin-ping.js              /admin-ping
```

### Standalone commands

A direct `.js` child of a category is a complete slash command. Its default export must contain:

- `data`: a `SlashCommandBuilder` whose name is globally unique.
- `execute(interaction, client)`: the command handler.
- `autocomplete(interaction, client)`: optional in practice, but required if the command defines autocomplete options.

At startup, `index.js` imports the module and stores it in `client.commands` under `command.data.name`.

### Root commands and subcommands

A bracketed folder such as `[server]` represents one root slash command. Its `index.js` owns the root `SlashCommandBuilder` and is the only module registered in `client.commands` at runtime.

Leaf files next to the root index use `SlashCommandSubcommandBuilder`. Their filename must equal `data.name`, because the root handler selects a leaf with `options.getSubcommand()` and dynamically imports `./<subcommand>.js`.

A nested bracketed folder such as `[member]` represents a Discord subcommand group. Its `index.js` owns a `SlashCommandSubcommandGroupBuilder`; leaf files inside it own `SlashCommandSubcommandBuilder` objects. Runtime dispatch becomes `./[<group>]/<subcommand>.js`.

The root `index.js` delegates both `execute` and `autocomplete` to the selected leaf. Business logic belongs in the leaf, while the root index should remain routing-only.

### Deployment versus execution

`npm run dp` runs `.script/deploy.js`. This is the schema-building phase:

1. Standalone command builders are serialized directly.
2. For every bracketed root, leaf builders are added with `addSubcommand()`.
3. Nested group builders receive their leaves and are added with `addSubcommandGroup()`.
4. The completed schemas are registered as guild commands using `CLIENTID`, `GUILDID`, and `TOKEN`.

Normal bot startup does not rebuild or register the Discord command schemas. Run deployment after changing a command name, description, option, subcommand, or group structure. Handler-only changes only require restarting the bot.

At startup, `subCommandMismatchChecker()` imports non-index leaf files under bracketed folders and rejects files whose filename differs from `data.name`. This protects the dynamic-import convention.

## Events and component triggers

Every `.js` file directly inside `events/` and `utils/` is treated as an event module with this shape:

```js
export default {
  name: Events.SomeEvent,
  once: false,
  async execute(...discordArguments, client) {}
};
```

Use `events/` for Discord lifecycle and interaction routing. Although `utils/chatCommand.js` currently acts as a `MessageCreate` listener, new non-event helpers should not be placed in `utils/`, because the startup loader assumes every file there is an event module.

Files under `trigger/<category>/` handle component interactions. A trigger exports a unique `customId` and `execute(interaction, client)`. `interactionTrigger.js` routes exact IDs. `interactionPage.js` additionally recognizes IDs shaped like `page:<number>_<id>`, converts them to `page_<id>`, and calls the trigger with the parsed page number as a third argument.

## Supporting code

- `function/` contains shared stateless helpers for logging, JSON configuration, time, UUIDs, and size formatting.
- `config.json` contains non-secret application settings such as `AdminRoleId`, scores, weights, and question distribution.
- `lang.json` contains user-facing question labels and category descriptions.
- `.env` contains Discord credentials and IDs; `.env.example` documents required environment variables.
- `.script/newCmd.js` and `.script/newTrigger.js` are interactive scaffolding tools exposed as `npm run newcmd` and `npm run newtri`.
- `.script/zip.js` and `.script/upload.js` support packaging and upload workflows.
- `log/` contains generated error logs and should not contain application code.
