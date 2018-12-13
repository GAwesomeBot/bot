const { get } = require("snekfetch");
const S = require("../../Modules/String");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, NSFWEmbed, Text, APIs, UserAgent } }, { serverDocument }, msg, commandData) => {
	if (msg.channel.nsfw) {
		if (msg.suffix) {
			const m = await msg.channel.send(Text.THIRD_PARTY_FETCH("We're fetching the requested images"));
			let query = msg.suffix.substring(0, msg.suffix.lastIndexOf(" "));
			let num = msg.suffix.substring(msg.suffix.lastIndexOf(" ") + 1);
			if (!query || isNaN(num)) {
				query = msg.suffix;
				num = serverDocument.config.command_fetch_properties.default_count;
			}
			if (num > serverDocument.config.command_fetch_properties.max_count) {
				num = serverDocument.config.command_fetch_properties.max_count;
			}
			const { body, statusCode } = await get(APIs.E621(query)).set({
				Accept: "application/json",
				"User-Agent": UserAgent,
			});
			if (body && statusCode === 200 && body.length) {
				const unparsed = [], descriptions = [], fields = [], images = [];
				for (let i = 0; i < num; i++) {
					const random = Math.floor(Math.random() * body.length);
					if (body[random] && !unparsed.includes(body[random])) unparsed.push(body[random]);
				}
				for (let i = 0; i < unparsed.length; i++) {
					const tempDesc = [
						`Made by **${unparsed[i].author}**`,
						`Click [here](https://e621.net/post/show/${unparsed[i].id}) to see the full post.`,
					];
					if (unparsed[i].description) {
						const d = `\`\`\`css\n${unparsed[i].description.split("").slice(0, 1500).join("")
							.replace(/(\[\/?b\]|\[\/?u\]|\[\/?i\])/g, "")}${unparsed[i].description.length > 1500 ? `...\`\`\` Read more [here](https://e621.net/post/show/${unparsed[i].id})` : "```"}`;
						tempDesc.push(d);
					}
					fields.push([
						{
							name: `» Favorites «`,
							value: `${unparsed[i].fav_count}`,
							inline: true,
						},
						{
							name: `» Rating «`,
							value: `${S(unparsed[i].rating).capitalize().s || "None"}`,
							inline: true,
						},
						{
							name: `» Score «`,
							value: `${unparsed[i].score}`,
							inline: true,
						},
					]);
					images.push(`${unparsed[i].file_url}`);
					descriptions.push(tempDesc.join("\n"));
				}
				const menu = new PaginatedEmbed(msg, descriptions, {
					color: Colors.RESPONSE,
					footer: `Result {current description} out of {total descriptions} results`,
				}, images, fields);
				await m.delete();
				await menu.init();
			} else {
				winston.verbose(`No "${commandData.name}" results found for "${query}"`);
				m.edit({
					embed: {
						color: Colors.SOFT_ERR,
						title: `Nothing was found 😥`,
						description: `Try again, perhaps this time you find what you desire. ( ͡° ͜ʖ ͡° )`,
					},
				});
			}
		} else {
			winston.verbose(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.send({
				embed: {
					color: Colors.INVALID,
					title: Text.NSFW_INVALID(),
					description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
				},
			});
		}
	} else {
		msg.send(NSFWEmbed);
	}
};
