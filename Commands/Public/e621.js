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
					];
					if (unparsed[i].description) {
						const d = `\`\`\`css\n${unparsed[i].description.substring(0, 1500)
							.replace(/\[\/?(?:b|u|i)\]/g, "")}${unparsed[i].description.length > 1500 ? `...\`\`\`` : "```"}`;
						tempDesc.push(d);
						tempDesc.push(`Click [here](https://e621.net/post/show/${unparsed[i].id}) to see the full post.`);
					}
					fields.push([
						{
							name: `Favorites 🌟`,
							value: `${unparsed[i].fav_count}`,
							inline: true,
						},
						{
							name: `Score ⭐`,
							value: `${unparsed[i].score}`,
							inline: true,
						},
						{
							name: `Rating 🌡`,
							value: `${S(unparsed[i].rating).capitalize().s || "None"}`,
							inline: true,
						},
					]);
					images.push(`${unparsed[i].file_url}`);
					descriptions.push(tempDesc.join("\n"));
				}
				const menu = new PaginatedEmbed(msg, {
					color: Colors.RESPONSE,
					footer: `Result {currentPage} out of {totalPages} results`,
				}, {
					descriptions,
					fields,
					images,
				});
				await m.delete();
				await menu.init();
			} else {
				logger.verbose(`No "${commandData.name}" results found for "${query}"`);
				m.edit({
					embed: {
						color: Colors.SOFT_ERR,
						title: `Nothing was found 😥`,
						description: `Try again, perhaps this time you find what you desire. ( ͡° ͜ʖ ͡° )`,
					},
				});
			}
		} else {
			logger.verbose(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.sendInvalidUsage(commandData, Text.NSFW_INVALID());
		}
	} else {
		msg.send(NSFWEmbed);
	}
};
