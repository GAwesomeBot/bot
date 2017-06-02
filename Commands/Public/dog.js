const random = require("random-animal");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
    random.dog().then(url => {
        msg.channel.createMessage({
            embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
                image: {
                    url: url
                }
            }
        });
    });
};
