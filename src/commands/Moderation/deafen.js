const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'deafen',
  aliases: ['serverdeafen', 'deaf'],
  category: 'Moderation',
  description: 'Server deafen or undeafen a member in voice',
  userPerms: ['DeafenMembers'],
  botPerms: ['DeafenMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to deafen/undeafen', type: 6, required: true },
    { name: 'state', description: 'true = deafen, false = undeafen', type: 5, required: true }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getBoolean('state'), client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const state = args[1]?.toLowerCase() !== 'false';
    return this._run(message, target, state, client);
  },

  async _run(ctx, target, state, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a user.`))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member?.voice.channel) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} User is not in a voice channel.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await member.voice.setDeaf(state);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔕 ${state ? 'Deafened' : 'Undeafened'}\n**${target.username}** has been ${state ? 'server deafened' : 'undeafened'}.\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
