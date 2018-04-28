const { get } = require("snekfetch");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, Text, APIs } }, { serverDocument }, msg, commandData) => {
	const { body, statusCode, statusText } = await get(APIs.URBAN(msg.suffix || null));
	if (statusCode === 200 && body) {
		if (!body.list.length) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "Definition for '404':",
					description: "Sorry, this definition could not be found.",
					footer: {
						text: "In other words, there were no results found for your search query. Maybe try searching for something else?",
					},
				},
			});
		}
		const descriptions = [];
		const fields = [];
		body.list.forEach(d => {
			let description = `${!msg.suffix ? `**${d.word}**:\n\n` : ""}${d.definition}`;
			let example = d.example ? `\n\n_${d.example}_` : "";
			if (description.length + example.length > 2000) {
				description = `${description.substring(0, 1997 - example.length)}...`;
				// This weird thing is to retain the formatting of the example (the underscores)
			}
			description += example;
			descriptions.push(description);
			fields.push([
				{
					name: "Author",
					value: d.author,
					inline: true,
				},
				{
					name: "Votes",
					value: `\\👍 ${d.thumbs_up} / ${d.thumbs_down} \\👎`,
					inline: true,
				},
				{
					name: "Permalink",
					value: d.permalink,
					inline: false,
				},
			]);
		});
		const menu = new PaginatedEmbed(msg, descriptions, {
			color: Colors.RESPONSE,
			title: `${!msg.suffix ? "Random d" : "D"}efinition {current description} out of {total descriptions}${msg.suffix ? ` for '${msg.suffix}'` : ""}:`,
			footer: body.tags && body.tags.length ? `Tags: ${body.tags.join(", ")}` : "",
		}, [], fields);
		await menu.init();
	} else {
		winston.debug(`Failed to fetch Urban Dictionary results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, statusCode, err: statusText });
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.COMMAND_ERR(),
				description: `I was unable to fetch results from Urban Dictionary!`,
			},
		});
	}
};
