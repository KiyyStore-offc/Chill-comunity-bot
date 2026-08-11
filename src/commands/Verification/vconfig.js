const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'vconfig',
  aliases: ['verconfig', 'versetrole', 'versetchannel'],
  category: 'Verification',
  description: 'Configure verification channel, role, or message',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    { name: 'setting', description: 'What to configure', type: 3, required: true, choices: [
      { name: 'channel', value: 'channel' },
      { name: 'role', value: 'role' },
      { name: 'title', value: 'title' },
      { name: 'description', value: 'description' },
      { name: 'buttonlabel', value: 'buttonlabel' }
    ]},
    { name: 'channel', description: 'Verification channel', type: 7, required: false },
    { name: 'role', description: 'Verification role', type: 8, required: false },
    { name: 'text', description: 'Text value (for title/description/buttonlabel)', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const setting = interaction.options.getString('setting');
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const text = interaction.options.getString('text');
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, setting, channel?.id, role?.id, text, client);
  },
  async execute(message, args, client) {
    const setting = args[0]?.toLowerCase();
    const channel = message.mentions.channels.first();
    const role = message.mentions.roles.first();
    const text = args.slice(1).join(' ');
    return this._run(message, setting, channel?.id, role?.id, text, client);
  },

  async _run(ctx, setting, channelId, roleId, text, client) {
    const guildId = ctx.guild.id;
    const settings = client.db.verification ? client.db.verification.get(guildId) : null;
    const current = settings || { guildId };
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);

    if (!setting) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a setting to configure: \`channel\`, \`role\`, \`title\`, \`description\`, \`buttonlabel\`.\nExample: \`vconfig channel #verify\` or \`vconfig role @Verified\``))], flags: MessageFlags.IsComponentsV2 });

    let updated = { ...current };
    let msg = '';

    if (setting === 'channel' && channelId) { updated.channelId = channelId; msg = `Verification channel set to <#${channelId}>.`; }
    else if (setting === 'role' && roleId) { updated.roleId = roleId; msg = `Verification role set to <@&${roleId}>.`; }
    else if (setting === 'title' && text) { updated.embedTitle = text; msg = `Embed title set to: **${text}**`; }
    else if (setting === 'description' && text) { updated.embedDesc = text; msg = `Embed description updated.`; }
    else if (setting === 'buttonlabel' && text) { updated.buttonLabel = text; msg = `Button label set to: **${text}**`; }
    else return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Invalid setting or missing value.`))], flags: MessageFlags.IsComponentsV2 });

    if (client.db.verification) client.db.verification.set(guildId, updated);
    return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Verification Config Updated\n${msg}\n\n-# Chill Verification • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
