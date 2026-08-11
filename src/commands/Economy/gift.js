const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'gift',
  aliases: ['present'],
  category: 'Economy',
  description: 'Send a gift box of coins to someone',
  cooldown: 3600,
  slashOptions: [
    { name: 'user', description: 'User to gift', type: 6, required: true },
    { name: 'amount', description: 'Amount to gift', type: 4, required: true, min_value: 100 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    return this._run(message, message.mentions.users.first(), parseInt(args[1]), client);
  },

  async _run(ctx, target, amount, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid user to gift.'))], flags: MessageFlags.IsComponentsV2 });
    if (!amount || amount < 100) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum gift is 100 coins.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, author.id);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = (eco.wallet || 0) - amount;
    saveEcoData(client, author.id, eco);
    const targetEco = getEcoData(client, target.id);
    targetEco.wallet = (targetEco.wallet || 0) + amount;
    targetEco.totalEarned = (targetEco.totalEarned || 0) + amount;
    saveEcoData(client, target.id, targetEco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎁 Gift Sent!\n**${author.username}** gifted **${formatNumber(amount)} coins** to **${target.username}**!\n\n> 👛 Your Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
