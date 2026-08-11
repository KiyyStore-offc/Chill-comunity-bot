const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const PRESTIGE_LEVEL_REQUIRED = 50;
const PRESTIGE_COST = 100000;

module.exports = {
  name: 'prestige',
  category: 'Economy',
  description: 'Reset your economy to gain prestige and permanent bonuses',
  cooldown: 10,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const canPrestige = (eco.level || 1) >= PRESTIGE_LEVEL_REQUIRED && (eco.wallet || 0) + (eco.bank || 0) >= PRESTIGE_COST;

    const info = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🌟 Prestige System\n` +
        `**Current Prestige:** \`${eco.prestige || 0}\`\n` +
        `**Current Level:** \`${eco.level || 1}\` (need Level ${PRESTIGE_LEVEL_REQUIRED})\n` +
        `**Required Coins:** \`${formatNumber(PRESTIGE_COST)}\` (you have \`${formatNumber((eco.wallet || 0) + (eco.bank || 0))}\`)\n\n` +
        `> 🌸 Prestige resets your level and coins but grants permanent bonuses!\n` +
        `> ✨ Each prestige increases all coin rewards by \`10%\`\n\n` +
        (canPrestige ? '**You can prestige! Click below to confirm.**' : '❌ You do not meet the requirements yet.') +
        `\n-# Chill Economy • Developed by AkiForver`
      ));

    if (!canPrestige) return ctx.reply({ components: [info], flags: MessageFlags.IsComponentsV2 });

    const confirmBtn = new ButtonBuilder().setCustomId('prestige_confirm').setLabel('Prestige Now').setStyle(ButtonStyle.Danger).setEmoji('🌟');
    const cancelBtn = new ButtonBuilder().setCustomId('prestige_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
    info.addSeparatorComponents(new SeparatorBuilder()).addActionRowComponents(row);

    const msg = await ctx.reply({ components: [info], flags: MessageFlags.IsComponentsV2 });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== userId) return i.reply({ content: '❌ Not for you.', flags: 64 });
      if (i.customId === 'prestige_cancel') {
        return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ❌ Prestige Cancelled'))], flags: MessageFlags.IsComponentsV2 });
      }
      eco.prestige = (eco.prestige || 0) + 1;
      eco.level = 1;
      eco.xp = 0;
      eco.wallet = 0;
      eco.bank = 0;
      saveEcoData(client, userId, eco);
      if (client.db.achievements) client.db.achievements.add(userId, 'prestige_1');
      await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🌟 Prestige ${eco.prestige} Achieved!\nYou have ascended! All stats reset with a **${eco.prestige * 10}% bonus** to earnings!\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
  }
};
