const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'kick',
  aliases: ['boot', 'remove'],
  category: 'Moderation',
  description: 'Kick a member from the server',
  userPerms: ['KickMembers'],
  botPerms: ['KickMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to kick', type: 6, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    return this._run({ author: interaction.user, guild: interaction.guild, member: interaction.member, reply: async (o) => interaction.reply(o) }, target, reason, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    return this._run(message, target, reason, client);
  },

  async _run(ctx, target, reason, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (opts) => ctx.reply ? ctx.reply(opts) : ctx.channel.send(opts);

    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a valid user.`))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} That user is not in this server.`))], flags: MessageFlags.IsComponentsV2 });
    if (!member.kickable) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} I cannot kick **${target.username}**.`))], flags: MessageFlags.IsComponentsV2 });

    try {
      await target.send({ content: `👢 You have been **kicked** from **${guild.name}**.\n**Reason:** ${reason}\n**Moderator:** ${author.username}` }).catch(() => {});
      await member.kick(`${reason} | Kicked by: ${author.username}`);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👢 Member Kicked\n**User:** ${target.username} (\`${target.id}\`)\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n\n-# Chill Moderation • Developed by AkiForver`));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed to kick: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
