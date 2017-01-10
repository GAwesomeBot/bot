const getUserProfile = require("./../../Modules/UserProfile.js");

module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix=="setup") {
		msg.channel.createMessage(`Hey ${msg.author.mention}, let's talk about your public AwesomeBot profile, available at ${config.hosting_url}activity/users?q=${encodeURIComponent(`${msg.author.username}#${msg.author.discriminator}`)}. First of all, do you want to make data such as your mutual servers with ${bot.user.username} and profile fields public?${userDocument.isProfilePublic ? " It's already public right now, by answering yes you're keeping it that way." : ""}`).then(() => {
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				userDocument.isProfilePublic = config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1;
				userDocument.save(err => {
					if(err) {
						winston.error("Failed to save user data for profile setup", {usrid: msg.author.id}, err);
					}
					msg.channel.createMessage(`Cool! 😀 Next up, what's the URL of the background image you'd like to use? Currently, it's ${userDocument.profile_background_image}, answer with \`.\` to continue using this.`).then(() => {
						bot.awaitMessage(msg.channel.id, msg.author.id, message => {
							const askDescription = () => {
								msg.channel.createMessage("Done, that's your new picture. 🏖 Now, please tell me a little about yourself (max 2000 characters)...").then(() => {
									bot.awaitMessage(msg.channel.id, msg.author.id, message => {
										if(message.content.trim()==".") {
											msg.channel.createMessage("I would've liked to know more about you, but your profile is all setup!");
										} else {
											if(!userDocument.profile_fields) {
												userDocument.profile_fields = {};
											}
											userDocument.profile_fields.Bio = message.content.trim();
											userDocument.markModified("profile_fields");
											userDocument.save(err => {
												if(err) {
													winston.error("Failed to save user data for profile setup", {usrid: msg.author.id}, err);
												}
												msg.channel.createMessage(`Thanks! Your profile is good to go! 👤 ${config.hosting_url}activity/users?q=${encodeURIComponent(`${msg.author.username}#${msg.author.discriminator}`)}`);
											});
										}
									});
								});
							};

							if(message.content.trim()==".") {
								askDescription();
							} else {
								userDocument.profile_background_image = message.content.trim();
								userDocument.save(err => {
									if(err) {
										winston.error("Failed to save user data for profile setup", {usrid: msg.author.id}, err);
									}
									askDescription();
								});
							}
						});
					});
				});
			});
		});
	} else if(suffix && suffix.toLowerCase()!="me") {
		if(suffix.indexOf("|")>-1) {
			const args = suffix.split("|");
			if(args.length==2 && args[0]) {
				const key = args[0].trim();
				
				const saveUserDocument = () => {
					userDocument.save(err => {
						if(err) {
							winston.error("Failed to save user data for adding profile field", {usrid: msg.author.id}, err);
							msg.channel.createMessage("Oops, something went wrong saving that. 😾");
						} else {
							msg.channel.createMessage("Got it 👍");
						}
					});
				};

				const setProfileField = remove => {
					if(remove) {
						delete userDocument.profile_fields[key];
					} else {
						if(!userDocument.profile_fields) {
							userDocument.profile_fields = {};
						}
						userDocument.profile_fields[key] = args[1].trim();
					}
					userDocument.markModified("profile_fields");
					saveUserDocument();
				};

				if(key.toLowerCase()=="location") {
					if(!args[1] || args[1].trim()==".") {
						userDocument.location = null;
					} else {
						userDocument.location = args[1].trim();
					}
					saveUserDocument();
				} else if(userDocument.profile_fields && userDocument.profile_fields[key]) {
					if(!args[1] || args[1].trim()==".") {
						setProfileField(true);
					} else {
						msg.channel.createMessage(`You've already set ${key} to \`${userDocument.profile_fields[key]}\`. Would you like to overwrite?`).then(() => {
							bot.awaitMessage(msg.channel.id, msg.author.id, message => {
								if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
									setProfileField();
								}
							});
						});
					}
				} else {
					setProfileField();
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
				msg.channel.createMessage(`That's not how you set a field in your profile. Use \`${commandData.name} <key>|<value>\``);
			}
		} else {
			if(userDocument.profile_fields && userDocument.profile_fields[suffix]) {
				msg.channel.createMessage(userDocument.profile_fields[suffix]);
			} else {
				msg.channel.createMessage(`Field \`${suffix}\` not found in your profile. Set it with \`${commandData.name} ${suffix}|<value>\``);
			}
		}
	} else {
		msg.channel.createMessage(getUserProfile(bot, config, msg.author, userDocument, msg.author.username));
	}
};
