const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const factsJSON = require("../../Configurations/facts.json");

module.exports = async ({ Constants: { Colors, Text, APIs } }, { serverDocument }, msg, commandData) => {
	let number = msg.suffix;
	if (number < 1) number = serverDocument.config.command_fetch_properties.default_count;
	else if (number > serverDocument.config.command_fetch_properties.max_count) number = serverDocument.config.command_fetch_properties.max_count;
	else if (isNaN(number)) number = serverDocument.config.command_fetch_properties.default_count;
	else number = parseInt(number);

	const dogfacts = factsJSON.dogs.sort(() => Math.random() > 0.5).slice(0, number);
	if (dogfacts.length) {
		const menu = new PaginatedEmbed(msg, {
			color: Colors.RESPONSE,
			title: `Dog fact {currentPage} out of {totalPages}`,
			footer: ``,
		}, {
			descriptions: dogfacts,
		});
		await menu.init();
	} else {
		logger.verbose(`Failed to fetch dog facts...`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.ERROR_TITLE(),
				description: `I was unable to fetch your perfect dog facts...`,
			},
		});
	}
};
