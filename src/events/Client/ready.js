const { prefix } = require("../../config.js");
const { ActivityType, REST, Routes, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clientReady",
  run: async (client) => {
    client.logger.log(`${client.user.username} (Chill) is now online. | Developed by AkiForver`, "ready");

    const giveawayManager = require("../../utils/giveawayManager");
    giveawayManager.init(client);

    const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
    const rebootData = client.db.reboot.getAll()[0];
    if (rebootData) {
      client.db.reboot.delete(rebootData.id);
      const channel = client.channels.cache.get(rebootData.channelId);
      if (channel) {
        try {
          const msg = await channel.messages.fetch(rebootData.messageId);
          if (msg) {
            const restartedContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `**${client.emoji.check} Chill has been successfully restarted.**\n-# Developed by AkiForver`
              ));
            await msg.edit({ components: [restartedContainer], flags: MessageFlags.IsComponentsV2 });
          }
        } catch (e) { }
      }
    }

    client.invites = new Map();
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const trackingEnabled = client.db.invitetracking.get(guildId);
        if (!trackingEnabled || !trackingEnabled.status) continue;
        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!me || !me.permissions.has(PermissionFlagsBits.ManageGuild)) continue;
        const invites = await guild.invites.fetch().catch(() => null);
        if (!invites) continue;
        const inviteCache = new Map();
        invites.forEach(invite => {
          inviteCache.set(invite.code, { uses: invite.uses, inviter: invite.inviter });
        });
        client.invites.set(guildId, inviteCache);
      } catch (error) { }
    }

    client.logger.log(
      `Chill ready on ${client.guilds.cache.size} servers | ${client.users.cache.size} users | Developed by AkiForver`,
      "ready",
    );

    for (const guild of client.guilds.cache.values()) {
      giveawayManager.syncGiveaways(client, guild).catch(() => { });
    }

    if (client.slashCommands.size > 0) {
      const rest = new REST({ version: "10" }).setToken(client.token);
      try {
        // Discord allows max 130 global slash commands — prioritize new feature categories
        const PRIORITY_CATEGORIES = ['Economy', 'Reaction', 'Moderation', 'AntiNuke', 'Verification', 'Information', 'Config', 'Filters', 'Utility', 'Music', 'Favourite', 'Owner'];
        const allCmds = Array.from(client.slashCommands.values());
        const sorted = PRIORITY_CATEGORIES.flatMap(cat => allCmds.filter(c => c.category === cat))
          .concat(allCmds.filter(c => !PRIORITY_CATEGORIES.includes(c.category)));
        const filtered = sorted.slice(0, 100);
        client.logger.log(`Slash commands: ${allCmds.length} total → deploying ${filtered.length} (Discord limit: 100)`, "cmd");
        const commands = filtered.map((cmd) => {
          const commandData = {
            name: cmd.name,
            description: (cmd.description || 'No description provided').slice(0, 100),
            options: (cmd.options || []).map(opt => ({
              ...opt,
              description: (opt.description || 'No description').slice(0, 100),
              choices: (opt.choices || []).map(c => ({ ...c, name: c.name.slice(0, 100) })),
              options: (opt.options || []).map(sub => ({ ...sub, description: (sub.description || 'No description').slice(0, 100) })),
            })),
          };
          if (cmd.owner) {
            commandData.default_member_permissions = "8";
            commandData.dm_permission = false;
          } else if (cmd.userPerms && cmd.userPerms.length > 0) {
            const { PermissionsBitField } = require("discord.js");
            try {
              commandData.default_member_permissions = PermissionsBitField.resolve(cmd.userPerms).toString();
            } catch (e) {
              console.error(`Error resolving perms for ${cmd.name}:`, e);
            }
          }
          return commandData;
        });

        client.logger.log(`Deploying ${commands.length} slash commands for Chill...`, "cmd");
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        client.logger.log(`Successfully deployed ${commands.length} slash commands.`, "cmd");
      } catch (error) {
        if (error.rawError?.errors) {
          console.error("Slash deploy errors (full):", JSON.stringify(error.rawError.errors, null, 2).slice(0, 2000));
        } else {
          console.error("Error deploying slash commands:", error.message);
        }
      }
    }

    const statuses = [
      `Serving ${client.guilds.cache.size} Guilds | Chill`,
      `Developed by AkiForver 🌸`,
      `Advanced Discord Bot | Chill`,
      `🎀 Chill is here for you!`,
      `Economy • Music • AntiNuke | Chill`,
      `${client.users.cache.size} Users | Chill`,
    ];

    let statusIndex = 0;
    setInterval(() => {
      const status = statuses[statusIndex % statuses.length];
      statusIndex++;
      client.user.setPresence({
        activities: [{ name: status, type: ActivityType.Custom }],
        status: "dnd",
      });
    }, 7000);
  },
};
