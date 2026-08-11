const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const CRIME_COOLDOWN = 14400000;
const crimes = [
  { name: 'Pickpocketed a tourist', pay: [300, 700], fail: 'Got caught pickpocketing!' },
  { name: 'Hacked a website', pay: [500, 1200], fail: 'Your IP was traced!' },
  { name: 'Sold counterfeit goods', pay: [400, 900], fail: 'Undercover cop was watching!' },
  { name: 'Robbed a convenience store', pay: [600, 1500], fail: 'Security camera caught you!' },
  { name: 'Ran a scam call center', pay: [800, 2000], fail: 'FBI raided your office!' },
];

module.exports = {
  name: 'crime',
  aliases: ['criminal'],
  category: 'Economy',
  description: 'Commit a crime for big rewards (or get caught)',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastCrime, CRIME_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Lay Low\nPolice are still looking for you!\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const crime = crimes[Math.floor(Math.random() * crimes.length)];
    eco.lastCrime = new Date().toISOString();

    if (Math.random() < 0.4) {
      const fine = Math.floor((eco.wallet || 0) * 0.3);
      eco.wallet = Math.max(0, (eco.wallet || 0) - fine);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🚔 Crime Failed!\n**${crime.fail}**\nYou paid a fine of \`${formatNumber(fine)} coins\`.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    const earned = Math.floor(Math.random() * (crime.pay[1] - crime.pay[0] + 1)) + crime.pay[0];
    eco.wallet = (eco.wallet || 0) + earned;
    eco.totalEarned = (eco.totalEarned || 0) + earned;
    saveEcoData(client, userId, eco);
    addXp(client, userId, 40);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔫 Crime Successful!\nYou **${crime.name}**!\n**Earned:** \`+${formatNumber(earned)} coins\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
