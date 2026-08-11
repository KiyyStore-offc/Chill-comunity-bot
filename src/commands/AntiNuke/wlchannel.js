const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anwlchannel',
  aliases: ['nukewlchan', 'antiwhitelistchannel'],
  category: 'AntiNuke',
  description: 'Whitelist a channel from certain anti-nuke checks',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add or remove', type: 3, required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }] },
    { name: 'channel', description: 'Channel to whitelist', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel');
    return this._run(interaction, action, channel?.id || null, client, true);
  },

  async execute(message, args, client, prefix) {
    const action = args[0]?.toLowerCase() || 'list';
    const channel = message.mentions.channels.first();
    const channelId = channel?.id || args[1];
    return this._run(message, action, channelId, client, false);
  },

  async _run(ctx, action, channelId, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, whitelistChannels: [] };
    const wlc = current.whitelistChannels || [];

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (action === 'add') {
      if (!channelId) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a channel.`))], flags: MessageFlags.IsComponentsV2 });
      if (wlc.includes(channelId)) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} <#${channelId}> is already whitelisted.`))], flags: MessageFlags.IsComponentsV2 });
      wlc.push(channelId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, whitelistChannels: wlc });
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Whitelisted\n<#${channelId}> will not trigger anti-nuke alerts.`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'remove') {
      if (!channelId || !wlc.includes(channelId)) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Channel not in whitelist.`))], flags: MessageFlags.IsComponentsV2 });
      const newWlc = wlc.filter(id => id !== channelId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, whitelistChannels: newWlc });
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Channel Removed\n<#${channelId}> removed from whitelist.`))], flags: MessageFlags.IsComponentsV2 });
    }

    const listText = wlc.length > 0 ? wlc.map((id, i) => `\`${i + 1}.\` <#${id}>`).join('\n') : '`No channels whitelisted.`';
    return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📋 Whitelisted Channels\n${listText}\n\n-# Total: ${wlc.length} • Chill AntiNuke`))], flags: MessageFlags.IsComponentsV2 });
  }
};
