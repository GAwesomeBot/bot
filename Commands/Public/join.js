module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
    msg.channel.createMessage({
        embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x00FF00,
            title: "Thanks for choosing " + bot.user.username + " 😊",
            description: `Click [here](${config.oauth_link}) to invite me to your server!`
        }
    });
};