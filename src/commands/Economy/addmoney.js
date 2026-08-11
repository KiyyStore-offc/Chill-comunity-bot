const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'addmoney',
  aliases: ['addcoins', 'givemoney'],
  category: 'Economy',
  description: 'Add coins to a user (Admin/Owner only)',
  owner: true,
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User', type: 6, required: true },
    { name: 'amount', description: 'Amount', type: 4, required: true, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    if (!client.owners?.includes(interaction.user.id)) return interaction.reply({ content: '❌ Owner only.', flags: 64 });
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    if (!client.owners?.includes(message.author.id)) return;
    const target = message.mentions.users.first();
    return this._run(message, target, parseInt(args[1]), client);
  },
  async _run(ctx, target, amount, client) {
    if (!target || !amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Invalid args.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, target.id);
    eco.wallet = (eco.wallet || 0) + amount;
    eco.totalEarned = (eco.totalEarned || 0) + amount;
    saveEcoData(client, target.id, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Coins Added\n+\`${formatNumber(amount)}\` coins to **${target.username}**\n> 👛 New Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
