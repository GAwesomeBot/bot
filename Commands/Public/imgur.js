const auth = require("./../../Configuration/auth.json");
const imgur = require("imgur-node-api");
imgur.setClientID(auth.tokens.imgur_client_id);

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let url;
	let urls = [];
	if (suffix && (/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/).test(suffix)) {
		url = suffix;
	}
	if (msg.attachments.length > 0) {
		if (msg.attachments.length === 1 && !url) {
			url = msg.attachments[0].url;
		} else if (msg.attachments.length === 1 && url) {
			urls.push(msg.attachments[0].url);
		} else if (msg.attachments.length > 1) {
			for (const attachement of msg.attachments) {
				urls.push(attachement.url);
			}
		}
	}
	if (!url && urls.length === 0) {
		winston.warn(`Parameters not provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		return msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `Did you forget what you wanted to upload? 🌅`,
				footer: {
					text: `Remember, the command usage is "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}"`,
				},
			},
		});
	}
	const m = await msg.channel.createMessage({
		embed: {
			color: 0x9ECDF2,
			description: `We are currently uploading your image(s) to imgur, please stand by!`,
			footer: {
				text: `This might take a while..`,
			},
		},
	});
	if (url && urls.length === 0) {
		imgur.upload(url, (err, res) => {
			if (err) {
				return m.edit({
					embed: {
						color: 0xFF0000,
						description: `There was an error while uploading to imgur!`,
						footer: {
							text: `"Imgur is probably down, again!" -- A very good quote`,
						},
					},
				});
			} else {
				return m.edit({
					embed: {
						image: {
							url: res.data.link,
						},
						color: 0x00FF00,
						footer: {
							text: `Powered by imgur`,
						},
					},
				});
			}
		});
	} else if (url && urls) {
		m.edit({
			embed: {
				color: 0x9ECDF2,
				description: `Do you want to upload the attached images and the provided link?`,
				footer: {
					text: `If you say yes, we'll upload all the images for you. Otherwise, we'll prioritize the link you provided!`,
				},
			},
		});
		bot.awaitMessage(msg.channel.id, msg.author.id, message => {
			try {
				message.delete();
			} catch (err) {
				// Ignore error
			}
			if (config.yes_strings.includes(message.content.trim())) {
				let results = [];
				let errors = [];
				imgur.upload(url, (err, res) => {
					if (err) {
						return errors.push(`${url}`);
					} else {
						return results.push(`${res.data.link}`);
					}
				});
				for (const uploadURL of urls) {
					imgur.upload(uploadURL, (err, res) => {
						if (err) {
							return errors.push(`${uploadURL}`);
						} else {
							return results.push(`${res.data.link}`);
						}
					});
				}
				if (results.length > 0 && errors.length === 0) {
					return m.edit({
						embed: {
							color: 0x00FF00,
							title: `Your images have been uploaded!`,
							description: `\`\`\`${results.join("\n")}\`\`\``,
							footer: {
								text: `They should be in the order of the URL provided followed by the attached images.`,
							},
						},
					});
				} else if (results.length > 0 && errors.length > 0) {
					return m.edit({
						embed: {
							color: 0xFFFF00,
							fields: [
								{
									name: `The following image(s) have been uploaded: 🎉`,
									value: `\`\`\`${results.join("\n")}\`\`\``,
									inline: false,
								},
								{
									name: `The following image(s) couldn't be uploaded: 😔`,
									value: `\`\`\`${errors.join("\n")}\`\`\``,
									inline: false,
								},
							],
						},
					});
				} else if (results.length === 0 && errors.length > 0) {
					return m.edit({
						embed: {
							color: 0xFF0000,
							title: `The following images couldn't be uploaded!`,
							description: `\`\`\`${errors.join("\n")}\`\`\``,
						},
					});
				} else {
					return m.edit({
						embed: {
							color: 0xFF0000,
							description: `Something completely weird happened! There were no results from uploading!`,
							footer: {
								text: `This should never happen! I blame imgur!`,
							},
						},
					});
				}
			} else {
				imgur.upload(url, (err, res) => {
					if (err) {
						return m.edit({
							embed: {
								color: 0xFF0000,
								description: `There was an error while uploading to imgur!`,
								footer: {
									text: `"Imgur is probably down, again!" -- A very good quote`,
								},
							},
						});
					} else {
						return m.edit({
							embed: {
								image: {
									url: res.data.link,
								},
								color: 0x00FF00,
								footer: {
									text: `Powered by imgur`,
								},
							},
						});
					}
				});
			}
		});
	} else if (!url && urls.length > 1) {
		let results = [];
		let errors = [];
		for (const uploadURL of urls) {
			imgur.upload(uploadURL, (err, res) => {
				if (err) {
					return errors.push(`${uploadURL}`);
				} else {
					return results.push(`${res.data.link}`);
				}
			});
		}
		if (results.length > 0 && errors.length === 0) {
			return m.edit({
				embed: {
					color: 0x00FF00,
					title: `Your images have been uploaded!`,
					description: `\`\`\`${results.join("\n")}\`\`\``,
					footer: {
						text: `They should be in the order of the attached images.`,
					},
				},
			});
		} else if (results.length > 0 && errors.length > 0) {
			return m.edit({
				embed: {
					color: 0xFFFF00,
					fields: [
						{
							name: `The following image(s) have been uploaded: 🎉`,
							value: `\`\`\`${results.join("\n")}\`\`\``,
							inline: false,
						},
						{
							name: `The following image(s) couldn't be uploaded: 😔`,
							value: `\`\`\`${errors.join("\n")}\`\`\``,
							inline: false,
						},
					],
				},
			});
		} else if (results.length === 0 && errors.lenght > 0) {
			return m.edit({
				embed: {
					color: 0xFF0000,
					title: `The following image(s) couldn't be uploaded!`,
					description: `\`\`\`${errors.join("\n")}\`\`\``,
				},
			});
		} else {
			return m.edit({
				embed: {
					color: 0xFF0000,
					description: `Something completely weird happened! There were no results from uploading!`,
					footer: {
						text: `This should never happen! I blame imgur!`,
					},
				},
			});
		}
	}
};
