const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anlogs',
  aliases: ['nukelogs', 'antiloggingchannel'],
  category: 'AntiNuke',
  description: 'Set or clear the channel where anti-nuke logs are sent',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [
    { name: 'channel', description: 'Log channel (leave empty to clear)', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    return this._run(interaction, channel?.id || null, client, true);
  },

  async execute(message, args, client, prefix) {
    const channel = message.mentions.channels.first();
    const channelId = channel?.id || args[0];
    return this._run(message, channelId, client, false);
  },

  async _run(ctx, channelId, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, logChannel: null };

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (!channelId) {
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, logChannel: null });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Log Channel Cleared\nAntiNuke logs will no longer be sent anywhere.\n\n-# Chill AntiNuke`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const channel = ctx.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Invalid text channel. Please mention a valid text channel.`));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, logChannel: channel.id });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.check} Log Channel Set\nAntiNuke events will be logged to <#${channel.id}>.\n\n` +
        `A test message has been sent to confirm access.\n\n-# Chill AntiNuke • Developed by AkiForver`
      ));

    channel.send({
      components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🛡️ Chill AntiNuke — Log Channel Active\nThis channel will receive anti-nuke alerts.\n-# Configured by <@${isSlash ? ctx.user.id : ctx.author.id}>`
      ))],
      flags: MessageFlags.IsComponentsV2
    }).catch(() => { });

    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
