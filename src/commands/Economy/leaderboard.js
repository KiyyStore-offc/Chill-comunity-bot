const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top', 'richest'],
  category: 'Economy',
  description: 'View the economy leaderboard',
  cooldown: 10,
  slashOptions: [
    { name: 'type', description: 'Sort by wallet, bank, xp, or total', type: 3, required: false, choices: [
      { name: '💰 Wallet', value: 'wallet' }, { name: '🏦 Bank', value: 'bank' },
      { name: '🔮 XP', value: 'xp' }, { name: '💎 Total Earned', value: 'totalEarned' }
    ]}
  ],

  async slashExecute(interaction, client) {
    const type = interaction.options.getString('type') || 'wallet';
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, type, client);
  },
  async execute(message, args, client) {
    const type = args[0]?.toLowerCase() || 'wallet';
    return this._run(message, type, client);
  },

  async _run(ctx, type, client) {
    const validTypes = ['wallet', 'bank', 'xp', 'totalEarned'];
    const sortBy = validTypes.includes(type) ? type : 'wallet';
    const labels = { wallet: '💰 Wallet', bank: '🏦 Bank', xp: '🔮 XP', totalEarned: '💎 Total Earned' };

    const lb = client.db.economy ? client.db.economy.getLeaderboard(sortBy, 10) : [];

    if (!lb || lb.length === 0) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏆 Leaderboard\nNo economy data yet! Use \`daily\`, \`work\`, etc. to earn coins.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    const medals = ['🥇', '🥈', '🥉'];
    let rows = '';
    for (let i = 0; i < lb.length; i++) {
      const u = lb[i];
      let username = u.userId;
      try { const user = await client.users.fetch(u.userId); username = user.username; } catch {}
      const medal = medals[i] || `\`${i + 1}.\``;
      rows += `${medal} **${username}** — \`${formatNumber(u[sortBy] || 0)}\`\n`;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('lb_type_select')
      .setPlaceholder(`Sorted by: ${labels[sortBy]}`)
      .addOptions(validTypes.map(t => ({ label: labels[t], value: t })));

    const row = new ActionRowBuilder().addComponents(select);
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🏆 Chill Economy Leaderboard\n**Sorted by:** ${labels[sortBy]}\n\n${rows}\n-# Chill Economy • Developed by AkiForver`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
