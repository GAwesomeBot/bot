const imgur = require("imgur");
const { IsURL } = require("../../Modules/Utils/index");
const { tokens: { imgurClientID } } = require("../../Configurations/auth");

imgur.setClientId(imgurClientID);

module.exports = async ({ Constants: { Colors, Text } }, documents, msg, commandData) => {
	if (msg.suffix === "credits" && configJSON.maintainers.includes(msg.author.id)) {
		const c = await imgur.getCredits();
		return msg.send({
			embed: {
				color: Colors.INFO,
				title: "Imgur Credits Info",
				description: require("util").inspect(c.data)
					.slice(2, -2)
					.replace(/ {2}|,/g, ""),
			},
		});
	}
	let filesToUpload = [];
	if (msg.attachments.size) {
		[...msg.attachments.values()].forEach(a => {
			filesToUpload.push(a.url);
		});
	}
	if (msg.suffix) {
		filesToUpload = filesToUpload.concat(
			msg.suffix.split(" ")
				.trimAll()
				.filter(IsURL));
	}
	if (!filesToUpload.length) {
		return msg.send({
			embed: {
				color: Colors.INVALID,
				title: `What should I upload? 😕`,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
				footer: {
					text: `Protip: You can use multiple URLs (separated by spaces) or attachments to upload them in one album!`,
				},
			},
		});
	}
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: "Uploading your images ⌛",
			description: "Please stand by...",
		},
	});

	let results = [];
	let albumLink;
	try {
		if (filesToUpload.length === 1) {
			results.push(await imgur.uploadUrl(filesToUpload[0]));
		} else {
			const album = await imgur.createAlbum();
			albumLink = `https://imgur.com/a/${album.data.id}`;
			for (const url of filesToUpload) {
				results.push(await imgur.uploadUrl(url, album.data.deletehash));
			}
		}
	} catch (err) {
		winston.debug(`Failed to upload image to Imgur`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
		switch (err.status) {
			case 400:
				if (err.message === "File is over the size limit") {
					return msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							title: "This file is huge! 💥",
							description: "You can only upload files with up to 10MB each! Blame Imgur for that limit.",
						},
					});
				} else if (err.message.code === 1003) {
					return msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							title: "What is this file supposed to be? ☢️",
							description: "One of your files has an invalid file type. Imgur only supports basic image formats.",
						},
					});
				}
				break;
			case 403:
			case 429:
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: "We're being rate limited! 😱",
						description: "Looks like we hit our daily upload limit. If you want to be able to upload more files consider asking an Admin to set a custom Imgur client ID for this server.",
					},
				});
			case 500:
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: "Imgur broke again! 🔨",
						description: "Imgur encountered an internal server error. Please try again later.",
					},
				});
		}
		return msg.send({
			embed: {
				color: Colors.ERROR,
				title: `Something went wrong! 😱`,
				description: "An unknown error occurred and we were unable to handle it.",
			},
		});
	}
	results = results.map(r => r.data.gifv || r.data.link);
	msg.send({
		embed: {
			color: Colors.RESPONSE,
			title: `Your image${results.length === 1 ? " is" : "s are"} uploaded! 🎉`,
			description: `${results.length === 1 ? "Here's the link" : "Here are the individual links"}:\n\n${results.join("\n")}${albumLink ? `\n\nAll images can be found in this album: ${albumLink}` : ""}`,
		},
	});
};
