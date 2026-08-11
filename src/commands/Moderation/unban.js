const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'unban',
  aliases: ['unbanuser', 'pardon'],
  category: 'Moderation',
  description: 'Unban a user from the server',
  userPerms: ['BanMembers'],
  botPerms: ['BanMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'userid', description: 'User ID to unban', type: 3, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getString('userid'), interaction.options.getString('reason') || 'No reason', client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0], args.slice(1).join(' ') || 'No reason', client);
  },

  async _run(ctx, userId, reason, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!userId) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a user ID.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await guild.bans.remove(userId, `${reason} | By: ${author.username}`);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ User Unbanned\n**ID:** \`${userId}\`\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message} (Are they actually banned?)`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
