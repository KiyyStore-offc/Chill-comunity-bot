const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');

const validActions = ['ban', 'kick', 'channelDelete', 'roleDelete', 'webhookCreate', 'adminGrant'];

module.exports = {
  name: 'anlimits',
  aliases: ['nukelimits', 'antilimit'],
  category: 'AntiNuke',
  description: 'Set custom action limits for the anti-nuke system',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'Action to set limit for (ban/kick/channelDelete/roleDelete/webhookCreate)', type: 3, required: false },
    { name: 'limit', description: 'Number of actions before triggering (1–20)', type: 4, required: false, min_value: 1, max_value: 20 }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action');
    const limit = interaction.options.getInteger('limit');
    return this._run(interaction, action, limit, client, true);
  },

  async execute(message, args, client, prefix) {
    const action = args[0];
    const limit = parseInt(args[1]);
    return this._run(message, action, isNaN(limit) ? null : limit, client, false);
  },

  async _run(ctx, action, limit, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, limits: {} };
    const currentLimits = current.limits || {};

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (!action || !limit) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⚙️ AntiNuke — Action Limits\nHow many actions within the time window trigger a punishment.\n\n` +
          `**Current Limits:**\n` +
          validActions.map(a => `> \`${a}\`: **${currentLimits[a] || 3}**`).join('\n') +
          `\n\n**Usage:** \`anlimits <action> <number>\`\n` +
          `**Actions:** \`${validActions.join(' • ')}\`\n\n` +
          `-# Example: anlimits ban 3 • Chill AntiNuke`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (!validActions.includes(action)) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${emoji.cross} Invalid action. Use one of: \`${validActions.join(', ')}\``
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const newLimits = { ...currentLimits, [action]: limit };
    if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, limits: newLimits });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.check} Limit Updated\n` +
        `**\`${action}\`** limit set to **${limit}** actions per time window.\n\n` +
        `-# Chill AntiNuke • Developed by AkiForver`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
