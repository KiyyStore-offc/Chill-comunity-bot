const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const STOCK_MARKET = [
  { symbol: 'AKRI', name: 'Chill Corp',    basePrice: 150,  volatility: 0.15 },
  { symbol: 'DSCRD', name: 'DiscordTech',  basePrice: 280,  volatility: 0.12 },
  { symbol: 'MNFT', name: 'Mooncraft',     basePrice: 95,   volatility: 0.25 },
  { symbol: 'NXGN', name: 'NextGen AI',   basePrice: 420,  volatility: 0.18 },
  { symbol: 'BTKN', name: 'BitToken',     basePrice: 1200, volatility: 0.35 },
  { symbol: 'GLXY', name: 'Galaxy Games', basePrice: 67,   volatility: 0.20 },
];

function getPrice(stock) {
  const seed = Math.floor(Date.now() / 3600000);
  const rng = Math.sin(seed * stock.basePrice) * 0.5 + 0.5;
  const change = 1 + (rng - 0.5) * stock.volatility * 2;
  return Math.max(10, Math.floor(stock.basePrice * change));
}

module.exports = {
  name: 'stocks',
  aliases: ['stock', 'invest2'],
  category: 'Economy',
  description: 'Buy and sell virtual stocks',
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'view, buy, sell, or portfolio', type: 3, required: false, choices: [
      { name: 'view', value: 'view' }, { name: 'buy', value: 'buy' },
      { name: 'sell', value: 'sell' }, { name: 'portfolio', value: 'portfolio' }
    ]},
    { name: 'symbol', description: 'Stock symbol (e.g. AKRI)', type: 3, required: false },
    { name: 'shares', description: 'Number of shares', type: 4, required: false, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) },
      interaction.options.getString('action') || 'view',
      interaction.options.getString('symbol')?.toUpperCase(),
      interaction.options.getInteger('shares'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0]?.toLowerCase() || 'view', args[1]?.toUpperCase(), parseInt(args[2]), client);
  },

  async _run(ctx, action, symbol, shares, client) {
    const userId = (ctx.author || ctx.user).id;

    if (action === 'view' || !action) {
      const lines = STOCK_MARKET.map(s => {
        const price = getPrice(s);
        const trend = price > s.basePrice ? '📈' : price < s.basePrice ? '📉' : '➡️';
        return `${trend} **${s.symbol}** (${s.name}) — \`${formatNumber(price)}\` coins/share`;
      }).join('\n');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📊 Stock Market\n*Prices update every hour*\n\n${lines}\n\nUse \`stocks buy <SYMBOL> <shares>\` to invest!\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'portfolio') {
      const holdings = client.db.stocks?.getAllHoldings(userId) || [];
      if (!holdings.length) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('📊 You have no stock holdings yet.\n\nUse `stocks buy <SYMBOL> <shares>` to start investing!\n-# Chill Economy'))], flags: MessageFlags.IsComponentsV2 });
      let total = 0;
      const lines = holdings.map(h => {
        const s = STOCK_MARKET.find(x => x.symbol === h.symbol);
        const price = s ? getPrice(s) : h.avgCost;
        const val = price * h.shares;
        const pnl = val - (h.avgCost * h.shares);
        const pnlStr = pnl >= 0 ? `+${formatNumber(Math.floor(pnl))}` : formatNumber(Math.floor(pnl));
        total += val;
        return `**${h.symbol}** × ${h.shares} shares | \`${formatNumber(price)}\`/ea | P&L: \`${pnlStr}\``;
      }).join('\n');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📊 Your Stock Portfolio\n\n${lines}\n\n> **Total Value:** \`${formatNumber(Math.floor(total))}\` coins\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (!symbol || !shares || shares < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Usage: `stocks buy/sell <SYMBOL> <shares>`'))], flags: MessageFlags.IsComponentsV2 });
    const stock = STOCK_MARKET.find(s => s.symbol === symbol);
    if (!stock) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Unknown stock symbol \`${symbol}\`. Use \`stocks view\` to see options.`))], flags: MessageFlags.IsComponentsV2 });
    const price = getPrice(stock);

    if (action === 'buy') {
      const cost = price * shares;
      const eco = getEcoData(client, userId);
      if ((eco.wallet || 0) < cost) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(cost)}\` coins but only have \`${formatNumber(eco.wallet||0)}\`.`))], flags: MessageFlags.IsComponentsV2 });
      eco.wallet -= cost;
      saveEcoData(client, userId, eco);
      client.db.stocks?.buy(userId, symbol, shares, price);
      client.db.transactions?.add(userId, 'stocks_buy', -cost, `Bought ${shares}x ${symbol}`);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📈 Stocks Purchased!\n**${shares}x ${symbol}** (${stock.name}) @ \`${formatNumber(price)}\` each\n\n> 💸 Spent: \`${formatNumber(cost)}\` coins\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'sell') {
      const holding = client.db.stocks?.getHolding(userId, symbol);
      if (!holding || holding.shares < shares) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You don't have enough ${symbol} shares to sell.`))], flags: MessageFlags.IsComponentsV2 });
      const proceeds = price * shares;
      client.db.stocks?.sell(userId, symbol, shares);
      const eco = getEcoData(client, userId);
      eco.wallet = (eco.wallet || 0) + proceeds;
      eco.totalEarned = (eco.totalEarned || 0) + proceeds;
      saveEcoData(client, userId, eco);
      client.db.transactions?.add(userId, 'stocks_sell', proceeds, `Sold ${shares}x ${symbol}`);
      const pnl = (price - holding.avgCost) * shares;
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📉 Stocks Sold!\n**${shares}x ${symbol}** @ \`${formatNumber(price)}\` each\n\n> 💰 Proceeds: \`${formatNumber(proceeds)}\` coins\n> 📊 P&L: \`${pnl >= 0 ? '+' : ''}${formatNumber(Math.floor(pnl))}\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
