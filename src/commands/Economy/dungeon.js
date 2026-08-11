const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const DUNGEON_COOLDOWN = 7200000;
const DUNGEONS = [
  { name: 'Goblin Cave', level: 1, reward: [200, 600], xp: 100, difficulty: 'Easy', successRate: 0.75 },
  { name: 'Haunted Forest', level: 5, reward: [500, 1500], xp: 200, difficulty: 'Medium', successRate: 0.60 },
  { name: 'Dragon Lair', level: 15, reward: [1500, 4000], xp: 500, difficulty: 'Hard', successRate: 0.45 },
  { name: 'Chill Void', level: 30, reward: [5000, 15000], xp: 1500, difficulty: 'Legendary', successRate: 0.25 },
];

module.exports = {
  name: 'dungeon',
  aliases: ['dungeon'],
  category: 'Economy',
  description: 'Enter a dungeon for big rewards',
  cooldown: 5,
  slashOptions: [{ name: 'dungeon', description: 'Dungeon to enter', type: 3, required: false, choices: DUNGEONS.map(d => ({ name: `${d.name} (Lv.${d.level}+)`, value: d.name })) }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('dungeon'), client);
  },
  async execute(message, args, client) { return this._run(message, args.join(' '), client); },

  async _run(ctx, dungeonName, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastDungeon, DUNGEON_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Dungeon Cooldown\nYou need to rest after your last adventure!\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const dungeon = DUNGEONS.find(d => d.name.toLowerCase() === dungeonName?.toLowerCase()) ||
      DUNGEONS.find(d => (eco.level || 1) >= d.level) || DUNGEONS[0];

    if (!dungeonName) {
      const list = DUNGEONS.map(d => `${(eco.level || 1) >= d.level ? '✅' : '🔒'} **${d.name}** (Lv.${d.level}+) — ${d.difficulty}\n  Reward: \`${formatNumber(d.reward[0])}-${formatNumber(d.reward[1])}\` | Rate: \`${(d.successRate*100).toFixed(0)}%\``).join('\n');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⚔️ Dungeons\n${list}\n\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    if ((eco.level || 1) < dungeon.level) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need Level **${dungeon.level}** to enter ${dungeon.name}. You're Level **${eco.level || 1}**.`))], flags: MessageFlags.IsComponentsV2 });

    eco.lastDungeon = new Date().toISOString();
    const success = Math.random() < dungeon.successRate;
    const reward = success ? Math.floor(Math.random() * (dungeon.reward[1] - dungeon.reward[0] + 1)) + dungeon.reward[0] : 0;

    if (success) {
      eco.wallet = (eco.wallet || 0) + reward;
      eco.totalEarned = (eco.totalEarned || 0) + reward;
      addXp(client, userId, dungeon.xp);
    }
    saveEcoData(client, userId, eco);

    const msg = success
      ? `### ⚔️ Dungeon Cleared! 🎉\n**${dungeon.name}** conquered!\n**Reward:** \`+${formatNumber(reward)} coins\`\n**XP:** \`+${dungeon.xp}\``
      : `### 💀 Dungeon Failed!\nYou were defeated in **${dungeon.name}**!\nBetter luck next time!`;

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(msg + `\n> 👛 Wallet: \`${formatNumber(eco.wallet || 0)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
