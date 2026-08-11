const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'vault',
  aliases: ['safebox', 'safe'],
  category: 'Economy',
  description: 'Secure vault — store coins safe from robbery',
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'deposit or withdraw or view', type: 3, required: false, choices: [
      { name: 'deposit', value: 'deposit' }, { name: 'withdraw', value: 'withdraw' }, { name: 'view', value: 'view' }
    ]},
    { name: 'amount', description: 'Amount to deposit/withdraw', type: 4, required: false, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action') || 'view';
    const amount = interaction.options.getInteger('amount');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, action, amount, client);
  },
  async execute(message, args, client) {
    const action = args[0]?.toLowerCase() || 'view';
    const amount = parseInt(args[1]);
    return this._run(message, action, amount, client);
  },

  async _run(ctx, action, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    const v = client.db.vault?.get(userId) || { balance: 0 };

    if (action === 'view' || !action) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔐 Your Vault\n\`\`\`ansi\n\u001b[1;32m🔐 Vault Balance  \u001b[0m :: \u001b[1;37m${formatNumber(v.balance||0)} coins\u001b[0m\n\`\`\`\n> Vault coins are **100% safe** from robbery and theft!\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (!amount || amount < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide a valid amount.'))], flags: MessageFlags.IsComponentsV2 });

    if (action === 'deposit') {
      const eco = getEcoData(client, userId);
      if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet||0)}\` in your wallet.`))], flags: MessageFlags.IsComponentsV2 });
      eco.wallet = (eco.wallet || 0) - amount;
      saveEcoData(client, userId, eco);
      client.db.vault?.deposit(userId, amount);
      const newV = client.db.vault?.get(userId) || { balance: 0 };
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔐 Deposited to Vault\n> 💰 Deposited: \`${formatNumber(amount)}\` coins\n> 🔐 Vault: \`${formatNumber(newV.balance)}\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'withdraw') {
      if ((v.balance || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Your vault only has \`${formatNumber(v.balance||0)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });
      client.db.vault?.withdraw(userId, amount);
      const eco = getEcoData(client, userId);
      eco.wallet = (eco.wallet || 0) + amount;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔐 Withdrew from Vault\n> 💰 Withdrawn: \`${formatNumber(amount)}\` coins\n> 🔐 Vault: \`${formatNumber((v.balance||0)-amount)}\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
