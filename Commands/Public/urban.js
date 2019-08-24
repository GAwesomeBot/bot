const { get } = require("snekfetch");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, Text, APIs } }, documents, msg, commandData) => {
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
			const description = `${!msg.suffix ? `**${d.word}**:\n\n` : ""}${d.definition.replace(/[_*~]/g, "\\$&")}`;
			let merged = `${description}${d.example ? `\n\n_${d.example.replace(/[_*~]/g, "\\$&")}_` : ""}`
				.replace(/\[.+?\]/g, m => `${m}(http://urbandictionary.com/define.php?term=${encodeURIComponent(m.slice(1, -1))})`);
			if (merged.length > 2048) {
				merged = `${merged.substring(0, 2044)}_...`;
			}
			descriptions.push(merged);
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
		const menu = new PaginatedEmbed(msg, {
			color: Colors.RESPONSE,
			title: `${!msg.suffix ? "Random d" : "D"}efinition {currentPage} out of {totalPages}${msg.suffix ? ` for '${msg.suffix}'` : ""}:`,
			footer: body.tags && body.tags.length ? `Tags: ${body.tags.join(", ")}` : "",
		}, {
			descriptions,
			fields,
		});
		await menu.init();
	} else {
		logger.debug(`Failed to fetch Urban Dictionary results`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, statusCode, err: statusText });
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.ERROR_TITLE(),
				description: `I was unable to fetch results from Urban Dictionary!`,
			},
		});
	}
};
