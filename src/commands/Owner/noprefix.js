const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder
} = require("discord.js");

function parseDuration(input) {
  if (!input) return { ok: true, expiresAt: null };

  const lower = input.toLowerCase();
  if (lower === 'p' || lower === 'perm' || lower === 'permanent') {
    return { ok: true, expiresAt: null };
  }

  const match = input.match(/^(\d+)(h|hr|hrs|d|day|w|week|m|y|yr|yrs)$/i);
  if (!match) return { ok: false };

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  let ms = 0;

  if (unit === 'h' || unit === 'hr' || unit === 'hrs') ms = value * 60 * 60 * 1000;
  else if (unit === 'd' || unit === 'day') ms = value * 24 * 60 * 60 * 1000;
  else if (unit === 'w' || unit === 'week') ms = value * 7 * 24 * 60 * 60 * 1000;
  else if (unit === 'm') ms = value * 30 * 24 * 60 * 60 * 1000;
  else if (unit === 'y' || unit === 'yr' || unit === 'yrs') ms = value * 365 * 24 * 60 * 60 * 1000;

  return { ok: true, expiresAt: new Date(Date.now() + ms) };
}

module.exports = {
  name: "noprefix",
  aliases: ["nopfx"],
  category: "Owner",
  description: "Add/remove no-prefix access (Owner only)",
  args: false,
  usage: "<add/remove/list> [@user] [duration]",
  owner: true,

  async execute(message, args, client, prefix) {
    if (!client.config.ownerID.includes(message.author.id)) return;

    if (!args[0]) {
      const usageDisplay = new TextDisplayBuilder()
        .setContent(
          `**Usage:**\n` +
          `\`${prefix}noprefix add <@user> [duration]\` - Grant no-prefix access\n` +
          `  **Duration:** \`24h\`, \`10d\`, \`2w\`, \`1m\`, \`1y\`, or \`permanent\` (default: permanent)\n` +
          `\`${prefix}noprefix remove <@user>\` - Revoke no-prefix access\n` +
          `\`${prefix}noprefix list\` - List users with no-prefix access`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(usageDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const sub = args[0].toLowerCase();

    if (sub === "add" || sub === "a" || sub === "+") {
      const user =
        message.mentions.users.first() ||
        (args[1] && /^\d+$/.test(args[1]) ? await client.users.fetch(args[1]).catch(() => null) : null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Provide me a valid user.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const durationArg = args[2];
      const parsed = parseDuration(durationArg);

      if (!parsed.ok) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.warn} Invalid duration format.**\n` +
            `**Examples:**\n` +
            `\`24h\` - 24 hours\n` +
            `\`10d\` - 10 days\n` +
            `\`2w\` - 2 weeks\n` +
            `\`1m\` - 1 month\n` +
            `\`1y\` - 1 year\n` +
            `\`permanent\` / \`perm\` / \`p\` - Permanent`
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const expiresAt = parsed.expiresAt;

      const existing = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (existing) {
        client.db.noprefix.updateOne(
          { userId: user.id, guildId: "GLOBAL", noprefix: true },
          { expiresAt: expiresAt }
        );

        const successMessage = expiresAt
          ? `**${client.emoji.check} Updated ${user}'s No Prefix Access, now expiring**\n**<t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
          : `**${client.emoji.check} Updated ${user}'s No Prefix Access to Permanent.**`;

        const successDisplay = new TextDisplayBuilder()
          .setContent(successMessage);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.create({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true,
        expiresAt: expiresAt
      });

      const successMessage = expiresAt
        ? `**${client.emoji.check} Granted ${user} No Prefix Access, expiring**\n**<t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
        : `**${client.emoji.check} Granted ${user} permanent No Prefix Access.**`;

      const successDisplay = new TextDisplayBuilder()
        .setContent(successMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (sub === "remove" || sub === "r" || sub === "-") {
      const user =
        message.mentions.users.first() ||
        (args[1] && /^\d+$/.test(args[1]) ? await client.users.fetch(args[1]).catch(() => null) : null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Provide me a valid user.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const existing = client.db.noprefix.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!existing) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} ${user} does not have No Prefix Access.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      client.db.noprefix.deleteOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Removed ${user} from No Prefix Access.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (sub === "list" || sub === "l") {
      const data = client.db.noprefix.find({
        guildId: "GLOBAL",
        noprefix: true
      });

      const ownerLines = client.config.ownerID.map((id, i) => `**\`${i + 1}.\`** <@${id}> - \`${id}\` *(Owner)*`);

      const userLines = await Promise.all(
        data
          .filter(x => !client.config.ownerID.includes(x.userId))
          .map(async (x, i) => {
            const u = await client.users.fetch(x.userId).catch(() => null);
            const name = u ? `<@${u.id}> - \`${u.id}\`` : `Unknown User - \`${x.userId}\``;
            const expiry = x.expiresAt
              ? ` — expires <t:${Math.floor(new Date(x.expiresAt).getTime() / 1000)}:R>`
              : ` — \`Permanent\``;
            return `**\`${ownerLines.length + i + 1}.\`** ${name}${expiry}`;
          })
      );

      const allLines = [...ownerLines, ...userLines];

      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**No Prefix Users [${allLines.length}]**`);

      const separator = new SeparatorBuilder();

      const listDisplay = new TextDisplayBuilder()
        .setContent(allLines.length ? allLines.join('\n') : '*No users have no-prefix access.*');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(listDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const usageDisplay = new TextDisplayBuilder()
      .setContent(
        `**${client.emoji.warn} Unknown subcommand.**\n` +
        `Use \`${prefix}noprefix add/remove/list\`.`
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(usageDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
