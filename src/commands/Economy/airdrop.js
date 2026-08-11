const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'airdrop',
  aliases: ['giveall', 'drop'],
  category: 'Economy',
  description: 'Admin: Airdrop coins to all members (online or all)',
  userPerms: ['ManageGuild'],
  cooldown: 10,
  slashOptions: [
    { name: 'amount', description: 'Coins to give each member', type: 4, required: true, min_value: 1 },
    { name: 'target', description: 'all or online', type: 3, required: false, choices: [{ name: 'All members', value: 'all' }, { name: 'Online only', value: 'online' }] }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply();
    return this._run({ author: interaction.user, guild: interaction.guild, editReply: (o) => interaction.editReply(o), isSlash: true }, interaction.options.getInteger('amount'), interaction.options.getString('target') || 'all', client);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]), args[1]?.toLowerCase() || 'all', client);
  },

  async _run(ctx, amount, target, client) {
    if (!amount || amount < 1) {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide a valid amount.'));
      return ctx.isSlash ? ctx.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 }) : ctx.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const guild = ctx.guild;
    await guild.members.fetch();
    let members = guild.members.cache.filter(m => !m.user.bot);
    if (target === 'online') members = members.filter(m => m.presence?.status === 'online');

    let count = 0;
    for (const [, member] of members) {
      try {
        const eco = getEcoData(client, member.id);
        eco.wallet = (eco.wallet || 0) + amount;
        eco.totalEarned = (eco.totalEarned || 0) + amount;
        saveEcoData(client, member.id, eco);
        client.db.transactions?.add(member.id, 'airdrop', amount, `Received airdrop from admin`);
        count++;
      } catch {}
    }

    const total = amount * count;
    const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ✈️ Airdrop Complete!\n\n> 💰 Amount per person: \`${formatNumber(amount)}\` coins\n> 👥 Recipients: \`${count}\` members\n> 💸 Total distributed: \`${formatNumber(total)}\` coins\n-# Chill Economy`
    ));
    return ctx.isSlash ? ctx.editReply({ components: [done], flags: MessageFlags.IsComponentsV2 }) : ctx.reply({ components: [done], flags: MessageFlags.IsComponentsV2 });
  }
};
