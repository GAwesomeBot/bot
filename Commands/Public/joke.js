const unirest = require("unirest");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if (suffix.trim().toLowerCase() === "faq") {
		return msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				title: `Why are you using the "Internet Chuck Norris Database" for jokes?`,
				description: `We are currently using this till we will find a more reliable joke API, which has more jokes.\nThe old API was dead, and horrible, containing ~10 jokes.\nPlease suggest us another joke API in the Discord Server! 😄`,
			},
		});
	} else {
		const api = `http://api.icndb.com/jokes/random?escape=javascript&firstName=${encodeURIComponent(msg.member.nick ? msg.member.nick : msg.author.username)}&lastName=`;
		unirest.get(api).header("Accept", "application/json").end(res => {
			if (res.status === 200 && res.body.type === "success") {
				const joke = res.body.value.joke.replace(/ {2}/g, " ").replace(/&quot;/gi, `"`);
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `${joke}`,
						footer: {
							text: `The joke is gotten through the "ICNDB", otherwise known as "The Internet Chuck Norris Database", with Chuck Norris's name replaced with your name.`,
						},
					},
				});
			} else {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `This command is a joke in itself... 😞`,
					},
				});
			}
		});
	}
};
