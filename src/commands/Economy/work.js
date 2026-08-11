const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

const WORK_COOLDOWN = 3600000;
const jobs = [
  { title: 'Software Engineer', pay: [300, 600], msg: 'You wrote some clean code and deployed a feature!' },
  { title: 'Chef', pay: [200, 450], msg: 'You cooked a delicious meal and got great tips!' },
  { title: 'Doctor', pay: [400, 700], msg: 'You saved a patient and received your salary!' },
  { title: 'Artist', pay: [150, 400], msg: 'You sold a painting at the gallery!' },
  { title: 'Streamer', pay: [100, 800], msg: 'You had a great stream and got tons of donations!' },
  { title: 'Teacher', pay: [200, 350], msg: 'You tutored students and earned your wages!' },
  { title: 'Mechanic', pay: [250, 500], msg: 'You fixed some cars and earned good money!' },
  { title: 'Hacker', pay: [500, 1000], msg: 'You did some ethical hacking and got paid!' },
  { title: 'Musician', pay: [100, 600], msg: 'Your concert was a hit! The crowd loved you!' },
  { title: 'Pilot', pay: [350, 650], msg: 'You flew a successful long-haul flight!' },
];

module.exports = {
  name: 'work',
  aliases: ['earn', 'job'],
  category: 'Economy',
  description: 'Work and earn coins',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastWork, WORK_COOLDOWN);

    if (cd > 0) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Already Working\nYou need to rest before working again!\n**Next work in:** \`${formatCooldown(cd)}\`\n\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const [min, max] = job.pay;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;

    eco.wallet = (eco.wallet || 0) + amount;
    eco.lastWork = new Date().toISOString();
    eco.totalEarned = (eco.totalEarned || 0) + amount;
    saveEcoData(client, userId, eco);
    addXp(client, userId, 30);
    client.db.transactions?.add(userId, 'work', amount, `Worked as ${job.title}`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.money} Work Complete!\n` +
        `**Job:** ${job.title}\n` +
        `**Result:** ${job.msg}\n\n` +
        `> 💰 **Earned:** \`+${formatNumber(amount)} coins\`\n` +
        `> 👛 **New Wallet:** \`${formatNumber(eco.wallet)} coins\`\n` +
        `\n-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
