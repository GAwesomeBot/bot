module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
    let description = "";
	if(suffix) {
		description += `\`\`\`${suffix}\`\`\``
	}
	let embed = {
		embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x00FF00,
			title: `**@${msg.author.username}** send an alert in #${msg.channel.name} on ${msg.channel.guild.name}${(suffix != "" ? ":" : "")}`,
			description: description
		}
	};
	bot.messageBotAdmins(msg.channel.guild, serverDocument, embed);
	msg.channel.createMessage("The admins have been alerted! ⚠");
};
