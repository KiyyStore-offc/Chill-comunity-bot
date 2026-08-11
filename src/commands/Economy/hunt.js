const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const HUNT_COOLDOWN = 3600000;
const prey = [
  { name: 'Rabbit', value: [50, 120], emoji: '🐰' },
  { name: 'Deer', value: [100, 250], emoji: '🦌' },
  { name: 'Wild Boar', value: [200, 400], emoji: '🐗' },
  { name: 'Bear', value: [400, 700], emoji: '🐻' },
  { name: 'Wolf', value: [600, 1000], emoji: '🐺' },
  { name: 'Dragon', value: [2000, 5000], emoji: '🐉' },
];

module.exports = {
  name: 'hunt',
  aliases: ['hunting', 'shoot'],
  category: 'Economy',
  description: 'Go hunting and earn coins',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastHunt, HUNT_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Hunting Cooldown\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const rand = Math.random();
    let animal;
    if (rand < 0.01) animal = prey[5];
    else if (rand < 0.06) animal = prey[4];
    else if (rand < 0.18) animal = prey[3];
    else if (rand < 0.38) animal = prey[2];
    else if (rand < 0.65) animal = prey[1];
    else animal = prey[0];

    const earned = Math.floor(Math.random() * (animal.value[1] - animal.value[0] + 1)) + animal.value[0];
    eco.wallet = (eco.wallet || 0) + earned;
    eco.totalEarned = (eco.totalEarned || 0) + earned;
    eco.lastHunt = new Date().toISOString();
    saveEcoData(client, userId, eco);
    addXp(client, userId, 30);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏹 Hunt Successful!\nYou hunted a **${animal.emoji} ${animal.name}**!\n**Earned:** \`+${formatNumber(earned)} coins\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
