const ArgParser = require("../../Modules/MessageUtils/Parser");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, Text, APIs, UserAgent, NSFWEmbed }, client }, { serverDocument }, msg, commandData) => {
	if (!msg.channel.nsfw) {
		return msg.send(NSFWEmbed);
	}
	if (!msg.suffix) {
		return msg.sendInvalidUsage(commandData, "You gotta give me somethin' to search for!");
	}

	let num;
	const args = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
	if (!isNaN(args[args.length - 1])) num = args.splice(-1);
	else num = serverDocument.config.command_fetch_properties.default_count;
	const query = args.join(" ");

	if (!num || num > serverDocument.config.command_fetch_properties.max_count) num = serverDocument.config.command_fetch_properties.default_count;
	else num = parseInt(num);

	const m = await msg.send(Text.THIRD_PARTY_FETCH("We're fetching the requested images"));

	const body = await fetch.get(APIs.SAFEBOORU(query, num)).set({
		Accepts: "application/json",
		"User-Agent": UserAgent,
	}).onlyBody()
		.catch(() => null);

	if (body && body.length) {
		const descriptions = [], fields = [], images = [];
		body.forEach(post => {
			descriptions.push(`Uploaded by ${post.uploader_name}\nClick [here](https://safebooru.donmai.us/posts/${post.id}) to see the full post.${!post.description || post.description === "" ? "" :
				`\`\`\`css\n${post.description.substring(0, 1500)
					.replace(/\[\/?(?:b|u|i)\]/g, "")}${post.description.length > 1500 ? `...\`\`\` Read more [here](https://safebooru.donmai.us/posts/${post.id})` : "```"}`}`);
			images.push(post.file_url);
			post.tag_string = post.tag_string.replace(/\*/g, "\\*");
			fields.push([
				{
					name: "Tags 🏷",
					value: post.tag_string.length > 1024 ? `${post.tag_string.substring(0, 1021)}...` : post.tag_string,
					inline: true,
				},
				{
					name: "Score ⭐",
					value: post.score,
					inline: true,
				},
				{
					name: "Rating 🌡",
					value: post.rating.toUpperCase(),
					inline: true,
				},
			]);
		});
		const menu = new PaginatedEmbed(msg, {
			color: Colors.RESPONSE,
			footer: `Result {currentPage} out of {totalPages} results`,
		}, {
			descriptions,
			fields,
			images,
		});
		await m.delete().catch();
		await menu.init();
	} else {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "Even Safebooru couldn't find an image! 😥",
			},
		});
	}
};
