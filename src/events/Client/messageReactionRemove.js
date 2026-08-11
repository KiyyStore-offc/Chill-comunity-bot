const { Events } = require('discord.js');

function getGiveawayEmojiId(client) {
    const match = client.emoji?.gwy?.match(/:(\d+)>/);
    return match ? match[1] : null;
}

module.exports = {
    name: Events.MessageReactionRemove,
    run: async (client, reaction, user) => {
        try {
            if (user.bot) return;

            if (reaction.partial) {
                try { await reaction.fetch(); } catch { return; }
            }
            if (reaction.message.partial) {
                try { await reaction.message.fetch(); } catch { return; }
            }

            const expectedId = getGiveawayEmojiId(client);
            if (expectedId && reaction.emoji.id !== expectedId) return;
            if (!expectedId && reaction.emoji.name !== 'giveaway') return;

            const giveaway = client.db.giveaways.get(reaction.message.id);
            if (!giveaway || giveaway.ended) return;

            if (giveaway.participants.includes(user.id)) {
                giveaway.participants = giveaway.participants.filter(id => id !== user.id);
                client.db.giveaways.set(reaction.message.id, giveaway);
            }
        } catch (err) {
            console.error('[Giveaway ReactionRemove Error]', err);
        }
    }
};
