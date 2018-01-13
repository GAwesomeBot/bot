const { get } = require("snekfetch");
const S = require("../../Modules/String");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors, NSFWEmbed, NSFWInvalid, Text, APIs } }, { serverDocument }, msg, commandData) => {
	if (msg.channel.nsfw) {
		if (msg.suffix) {
			let m = await msg.channel.send({
				embed: {
					color: Colors.INFO,
					description: `We're fetching the requested images... Please stand by...`,
					footer: {
						text: `This might take a while!`,
					},
				},
			});
			let query = msg.suffix.substring(0, msg.suffix.lastIndexOf(" "));
			let num = msg.suffix.substring(msg.suffix.lastIndexOf(" ") + 1);
			if (!query || isNaN(num)) {
				query = msg.suffix;
				num = serverDocument.config.command_fetch_properties.default_count;
			}
			if (num > serverDocument.config.command_fetch_properties.max_count) {
				num = serverDocument.config.command_fetch_properties.max_count;
			}
			let { body, status } = await get(APIs.E621(query)).set({
				Accept: "application/json",
				"User-Agent": "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)",
			});
			if (body && status === 200) {
				const unparsed = [], descriptions = [], fields = [], images = [];
				for (let i = 0; i < num; i++) {
					const random = Math.floor(Math.random() * body.length);
					unparsed.push(body[random]);
				}
				for (let i = 0; i < unparsed.length; i++) {
					const tempDesc = [
						`Made by **${unparsed[i].author}**`,
						`Click [here](https://e621.net/post/show/${unparsed[i].id}) to see the full post.`,
					];
					if (unparsed[i].description) {
						let d = `\`\`\`css\n${unparsed[i].description.split("").slice(0, 1500).join("")
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
				msg.channel.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `e621 failed me.. 😥`,
						description: `Try again, maybe you can find what you wanted. ( ͡° ͜ʖ ͡° )`,
					},
				});
			}
		} else {
			winston.verbose(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.send({
				embed: {
					color: Colors.INVALID,
					title: NSFWInvalid(),
					description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
				},
			});
		}
	} else {
		msg.channel.send(NSFWEmbed);
	}
};
