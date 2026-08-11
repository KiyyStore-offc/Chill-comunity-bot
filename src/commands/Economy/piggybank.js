const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'piggybank',
  aliases: ['piggy', 'savings'],
  category: 'Economy',
  description: 'View or smash your piggy bank',
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add or break', type: 3, required: false, choices: [
      { name: 'add', value: 'add' }, { name: 'break', value: 'break' }
    ]},
    { name: 'amount', description: 'Amount to add', type: 4, required: false, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('action') || 'view', interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0]?.toLowerCase() || 'view', parseInt(args[1]), client);
  },

  async _run(ctx, action, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    const pig = client.db.piggybank?.get(userId) || { balance: 0 };

    if (action === 'view') {
      const breakBtn = new ButtonBuilder().setCustomId('pig_break').setLabel('🐷 Smash Piggy Bank').setStyle(ButtonStyle.Danger).setDisabled((pig.balance || 0) === 0);
      const row = new ActionRowBuilder().addComponents(breakBtn);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🐷 Your Piggy Bank\n\n> 💰 Saved: \`${formatNumber(pig.balance || 0)}\` coins\n\n*Smash it to claim all savings!*\n-# Chill Economy`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(row);
      const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
      const coll = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
      coll.on('collect', async (i) => {
        if (i.user.id !== userId) { await i.reply({ content: '❌ Not your piggy bank!', ephemeral: true }); return; }
        await i.deferUpdate(); coll.stop();
        const saved = client.db.piggybank?.break(userId) || 0;
        const eco = getEcoData(client, userId);
        eco.wallet = (eco.wallet || 0) + saved;
        eco.totalEarned = (eco.totalEarned || 0) + saved;
        saveEcoData(client, userId, eco);
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🐷 Piggy Bank Smashed!\n💥 You broke open your piggy bank!\n\n> 💰 Collected: \`${formatNumber(saved)}\` coins\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      });
      return;
    }

    if (action === 'add') {
      if (!amount || amount < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide a valid amount to save.'))], flags: MessageFlags.IsComponentsV2 });
      const eco = getEcoData(client, userId);
      if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet||0)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });
      eco.wallet -= amount;
      saveEcoData(client, userId, eco);
      client.db.piggybank?.add(userId, amount);
      const newPig = client.db.piggybank?.get(userId) || { balance: amount };
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🐷 Saved to Piggy Bank!\n\n> 💰 Added: \`${formatNumber(amount)}\`\n> 🐷 Total saved: \`${formatNumber(newPig.balance)}\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'break') {
      const saved = client.db.piggybank?.break(userId) || 0;
      if (!saved) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Your piggy bank is empty!\n-# Chill Economy'))], flags: MessageFlags.IsComponentsV2 });
      const eco = getEcoData(client, userId);
      eco.wallet = (eco.wallet || 0) + saved;
      eco.totalEarned = (eco.totalEarned || 0) + saved;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🐷 Piggy Bank Smashed!\n💥 You broke open your piggy bank!\n\n> 💰 Collected: \`${formatNumber(saved)}\` coins\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
