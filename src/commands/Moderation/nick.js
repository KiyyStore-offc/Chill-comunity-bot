const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'nick',
  aliases: ['nickname', 'setnick', 'changenick'],
  category: 'Moderation',
  description: 'Change or reset a member\'s nickname',
  userPerms: ['ManageNicknames'],
  botPerms: ['ManageNicknames'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'nickname', description: 'New nickname (leave empty to reset)', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getString('nickname') || null, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const nick = args.slice(1).join(' ') || null;
    return this._run(message, target, nick, client);
  },

  async _run(ctx, target, nick, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a user.`))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Member not found.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await member.setNickname(nick);
      const msg = nick ? `Nickname set to **${nick}** for **${target.username}**.` : `Nickname **reset** for **${target.username}**.`;
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏷️ Nickname Updated\n${msg}\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
