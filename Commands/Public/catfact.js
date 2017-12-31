const { get } = require("snekfetch");
const PaginatedMenu = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, Text, APIs } }, { serverDocument }, msg, commandData) => {
	let number = msg.suffix;
	if (number < 1) number = serverDocument.config.command_fetch_properties.default_count;
	else if (number > serverDocument.config.command_fetch_properties.max_count) number = serverDocument.config.command_fetch_properties.max_count;
	else if (isNaN(number)) number = serverDocument.config.command_fetch_properties.default_count;
	else number = parseInt(number);

	const { body, status, statusText } = await get(APIs.CATFACT()).query("limit", number);
	if (status === 200 && body && body.data.length) {
		const facts = [];
		body.data.forEach(d => {
			facts.push(d.fact);
		});
		const menu = new PaginatedMenu(msg, facts, {
			color: Colors.RESPONSE,
			title: `Cat fact {current description} out of {total descriptions}`,
			footer: ``,
		});
		await menu.init();
	} else {
		winston.verbose(`Failed to fetch cat facts...`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, status, err: statusText });
		msg.channel.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.COMMAND_ERR(),
				description: `I was unable to fetch your purrfect cat facts...`,
			},
		});
	}
};
