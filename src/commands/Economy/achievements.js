const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

const ALL_ACHIEVEMENTS = [
  { id: 'first_daily', name: '🌟 First Steps', desc: 'Claim your first daily reward' },
  { id: 'rich_100k', name: '💰 Hundred Thousandaire', desc: 'Earn a total of 100,000 coins' },
  { id: 'worker_50', name: '👷 Hardworker', desc: 'Work 50 times' },
  { id: 'fisher_100', name: '🎣 Master Angler', desc: 'Catch 100 fish' },
  { id: 'miner_50', name: '⛏️ Deep Miner', desc: 'Mine 50 times' },
  { id: 'gambler_win', name: '🎰 Lucky One', desc: 'Win a gamble over 10,000 coins' },
  { id: 'level_10', name: '📶 Veteran', desc: 'Reach level 10' },
  { id: 'prestige_1', name: '🌸 Prestige Master', desc: 'Prestige for the first time' },
  { id: 'heist_success', name: '🦹 Mastermind', desc: 'Complete a successful heist' },
  { id: 'crime_10', name: '🔫 Repeat Offender', desc: 'Commit 10 crimes' },
];

module.exports = {
  name: 'achievements',
  aliases: ['ach', 'badges', 'medals'],
  category: 'Economy',
  description: 'View your achievements',
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to check', type: 6, required: false }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    return this._run(message, target, client);
  },
  async _run(ctx, target, client) {
    const earned = client.db.achievements ? client.db.achievements.get(target.id) : [];
    const list = ALL_ACHIEVEMENTS.map(a => `${earned.includes(a.id) ? '✅' : '⬜'} **${a.name}**\n  *${a.desc}*`).join('\n');
    const count = ALL_ACHIEVEMENTS.filter(a => earned.includes(a.id)).length;
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏅 ${target.username}'s Achievements\n**Progress:** \`${count}/${ALL_ACHIEVEMENTS.length}\`\n\n${list}\n\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
