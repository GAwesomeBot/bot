const { Trivia } = require("../../Modules/");

module.exports = async (main, { serverDocument, channelDocument }, msg, commandData) => {
	if (msg.suffix) {
		const split = msg.suffix.split(" ");
		const action = split.shift().toLowerCase().trim();
		if (action !== "start" && !channelDocument.trivia.isOngoing) {
			msg.channel.send({
				embed: {
					color: 0xCC0F16,
					description: `There isn't an ongoing Trivia Game in this channel. 🍎`,
					footer: {
						text: `Use \`${msg.guild.commandPrefix}${commandData.name} start\` to get started.`,
					},
				},
			});
			return;
		}
		let set = "default";
		switch (action) {
			case "start":
				if (msg.suffix.includes(" ") && split.length) set = split.join(" ");
				await Trivia.start(main.bot, msg.guild, serverDocument, msg.author, msg.channel, channelDocument, set);
				break;
			case "end":
			case ".":
				await Trivia.end(main.bot, msg.guild, serverDocument, msg.channel, channelDocument);
				break;
			case "skip":
			case "next":
				Trivia.next(main.bot, msg.guild, serverDocument, msg.channel, channelDocument);
				break;
			default:
				Trivia.answer(main.bot, msg.guild, serverDocument, msg.author, msg.channel, channelDocument, msg.suffix);
				break;
		}
	} else if (channelDocument.trivia.isOngoing) {
		const fields = [
			{
				name: `Current Progress`,
				value: `${channelDocument.trivia.past_questions.length} Question${channelDocument.trivia.past_questions.length === 1 ? "" : "s"} completed\nScore: ${channelDocument.trivia.score}`,
				inline: true,
			},
		];
		if (channelDocument.trivia.set_id !== "default" && channelDocument.trivia.set_id) {
			fields.push({
				name: `Current Set`,
				value: `${channelDocument.trivia.set_id}`,
				inline: true,
			});
		}
		msg.channel.send({
			embed: {
				color: 0x3669FA,
				description: `Information about the current Trivia Game 🎳`,
				fields,
			},
		});
	} else {
		msg.channel.send({
			embed: {
				color: 0xCC0F16,
				description: `Trivia Gaemz! Learn more about them [here](${main.configJS.hostingURL}wiki/Commands#trivia).`,
				footer: {
					text: `Use "${msg.guild.commandPrefix}${commandData.name} start" to start a new Trivia Game 🎮`,
				},
			},
		});
	}
};
