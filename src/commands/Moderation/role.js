const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'role',
  aliases: ['giverole', 'removerole', 'addrole'],
  category: 'Moderation',
  description: 'Add or remove a role from a member',
  userPerms: ['ManageRoles'],
  botPerms: ['ManageRoles'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add or remove', type: 3, required: true, choices: [{ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }] },
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'role', description: 'Role', type: 8, required: true }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getString('action'), interaction.options.getUser('user'), interaction.options.getRole('role'), client);
  },
  async execute(message, args, client) {
    const action = args[0]?.toLowerCase();
    const target = message.mentions.users.first();
    const role = message.mentions.roles.first();
    return this._run(message, action, target, role, client);
  },

  async _run(ctx, action, target, role, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!action || !target || !role) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Usage: \`role <add/remove> @user @role\``))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Member not found.`))], flags: MessageFlags.IsComponentsV2 });
    const me = guild.members.me;
    if (role.position >= (me?.roles.highest.position || 0)) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} I cannot manage that role.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      if (action === 'add') await member.roles.add(role);
      else await member.roles.remove(role);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎭 Role ${action === 'add' ? 'Added' : 'Removed'}\n${action === 'add' ? 'Added' : 'Removed'} **${role.name}** ${action === 'add' ? 'to' : 'from'} **${target.username}**\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
