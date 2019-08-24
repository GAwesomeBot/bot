module.exports = async ({ client, configJS, Utils: { IsURL }, Constants: { Colors } }, msg, commandData) => {
	const handleQuit = () => {
		msg.reply({
			embed: {
				color: Colors.RED,
				description: `You've exited the profile setup menu!`,
			},
		});
	};

	if (msg.suffix === "setup") {
		let m = await msg.reply({
			embed: {
				color: Colors.LIGHT_BLUE,
				author: {
					name: `Profile setup for ${msg.author.tag}`,
				},
				title: `Let's setup your GAwesomeBot profile ~~--~~ See it by clicking here`,
				url: `${configJS.hostingURL}activity/users?q=${encodeURIComponent(`${msg.author.tag}`)}`,
				thumbnail: {
					url: msg.author.displayAvatarURL({ size: 64, format: "png" }),
				},
				description: `First of all, do you want to make data such as mutual servers with me and profile fields public?`,
				footer: {
					text: msg.author.userDocument.isProfilePublic ? `It's already public now, by answering "yes" you're keeping it that way.` : `It's currently not public, by answering "yes" you're making it public.`,
				},
			},
		});
		const changes = {};
		let message = null;
		try {
			message = await client.awaitPMMessage(msg.channel, msg.author);
		} catch (err) {
			switch (err.code) {
				case "AWAIT_QUIT": return handleQuit();
				case "AWAIT_EXPIRED": {
					m = await m.edit({
						embed: {
							color: Colors.LIGHT_ORANGE,
							description: `You didn't answer in time... We'll keep your profile's publicity the way it currently is.`,
							footer: {
								text: `Changed your mind? Type "quit" and restart the process by running "profile setup"`,
							},
						},
					});
					changes.isProfilePublic = msg.author.userDocument.isProfilePublic;
				}
			}
		}
		if (message && message.content) changes.isProfilePublic = configJS.yesStrings.includes(message.content.toLowerCase().trim());

		m = await msg.reply({
			embed: {
				color: Colors.LIGHT_BLUE,
				title: `Next, here's your current backround.`,
				image: {
					url: IsURL(msg.author.userDocument.profile_background_image) ? msg.author.userDocument.profile_background_image : ``,
				},
				thumbnail: {
					url: msg.author.displayAvatarURL({ size: 64, format: "png" }),
				},
				author: {
					name: `Profile setup for ${msg.author.tag}`,
				},
				description: `Your current image URL is: \`\`\`\n${msg.author.userDocument.profile_background_image}\`\`\`\nWould you like a new one? Just paste in a URL.`,
				footer: {
					text: `Answer with "." to not change it, or "default" to reset it to the default image. | This message expires in 2 minutes`,
				},
			},
		});
		try {
			message = await client.awaitPMMessage(msg.channel, msg.author, 120000);
		} catch (err) {
			message = undefined;
			switch (err.code) {
				case "AWAIT_QUIT": return handleQuit();
				case "AWAIT_EXPIRED": {
					m = await m.edit({
						embed: {
							color: Colors.LIGHT_ORANGE,
							description: `You didn't answer in time... We'll keep your current profile backround.`,
							footer: {
								text: `Changed your mind? Type "quit" and restart the process by running "profile setup"`,
							},
						},
					});
					changes.profile_background_image = msg.author.userDocument.profile_background_image;
				}
			}
		}
		if (message) {
			if (message.content.toLowerCase().trim() === "default") {
				changes.profile_background_image = "http://i.imgur.com/8UIlbtg.jpg";
			} else if (message.content === ".") {
				changes.profile_background_image = msg.author.userDocument.profile_background_image;
			} else if (message.content !== "") {
				changes.profile_background_image = message.content.trim();
			}
		}

		m = await msg.reply({
			embed: {
				color: Colors.LIGHT_BLUE,
				title: `Done! That will be your new picture. 🏖`,
				description: `Now, can you please tell us a little about yourself...? (max 2000 characters)`,
				thumbnail: {
					url: msg.author.displayAvatarURL({ size: 64, format: "png" }),
				},
				author: {
					name: `Profile setup for ${msg.author.tag}`,
				},
				footer: {
					text: `Answer with "." to not change your bio, or "none" to reset it | This message expires in 5 minutes`,
				},
			},
		});
		try {
			message = await client.awaitPMMessage(msg.channel, msg.author, 300000);
		} catch (err) {
			message = undefined;
			switch (err.code) {
				case "AWAIT_QUIT": return handleQuit();
				case "AWAIT_EXPIRED": {
					m = await m.edit({
						embed: {
							color: Colors.LIGHT_ORANGE,
							description: `You didn't answer in time... We'll keep your current bio.`,
							footer: {
								text: `Changed your mind? Type "quit" and restart the process by running "profile setup"`,
							},
						},
					});
					if (msg.author.userDocument.profile_fields && msg.author.userDocument.profile_fields.Bio) changes.Bio = msg.author.userDocument.profile_fields.Bio;
				}
			}
		}
		if (message && message.content) {
			if (message.content.trim() === ".") {
				if (msg.author.userDocument.profile_fields && msg.author.userDocument.profile_fields.Bio) changes.Bio = msg.author.userDocument.profile_fields.Bio;
				else changes.Bio = null;
			} else if (message.content.toLowerCase().trim() === "none") {
				changes.Bio = "delete";
			} else {
				changes.Bio = message.content.trim();
			}
		}
		const userQueryDocument = msg.author.userDocument.query;
		userQueryDocument.set("isProfilePublic", changes.isProfilePublic)
			.set("profile_background_image", changes.profile_background_image);
		if (!msg.author.userDocument.profile_fields) userQueryDocument.set("profile_fields", {});
		if (changes.Bio === "delete") {
			userQueryDocument.remove("profile_fields.Bio");
		} else if (changes.Bio) {
			userQueryDocument.set("profile_fields.Bio", changes.Bio);
		}
		await msg.author.userDocument.save().catch(err => {
			logger.warn(`Failed to save user data for profile setup.`, { usrid: msg.author.id }, err);
		});
		msg.reply({
			embed: {
				color: Colors.GREEN,
				title: `You're all set! ~~--~~ Click here to see your profile. 👀`,
				description: `Thanks for your input.`,
				url: `${configJS.hostingURL}activity/users?q=${encodeURIComponent(`${msg.author.tag}`)}`,
				footer: {
					text: `Changed your mind? Run "profile setup" once again!`,
				},
			},
		});
	}
};
