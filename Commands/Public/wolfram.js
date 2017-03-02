const wolfram_node = require("wolfram-node");
const auth = require("./../../Configuration/auth.json");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const wolfram = wolfram_node.init(auth.tokens.wolfram_app_id);
		wolfram.ask({query: suffix}, (err, res) => {
			if(err) {
				winston.error("Failed to connect to Wolfram|Alpha", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("Unfortunately, I didn't get anything back from Wolfram|Alpha 😔");
			} else {
				try {
					const info = res.pod.map(a => {
						return `**${a.$.title}**\n${a.subpod[0].plaintext[0] || a.subpod[0].img[0].$.src}`;
					});
					bot.sendArray(msg.channel, info);
				} catch(err) {
					winston.warn(`No Wolfram|Alpha data found for '${suffix}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
					msg.channel.createMessage("💡 Wolfram|Alpha has nothing");
				}
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} i gotta have somethin to search for bruh`);
	}
};
