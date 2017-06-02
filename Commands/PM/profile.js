const getUserProfile = require("./../../Modules/UserProfile.js");

module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix == "setup") {
		msg.channel.createMessage({
			embed: {
				author: {
					name: bot.user.username,
					icon_url: bot.user.avatarURL,
					url: "https://github.com/GilbertGobbels/GAwesomeBot"
				},
				color: 0x9ECDF2,
				title: `Profile Setup for __${msg.author.username}__`,
				description: `Hey ${msg.author.mention}, let's talk about your public AwesomeBot profile, available [here](${config.hosting_url}activity/users?q=${encodeURIComponent(`${msg.author.username}#${msg.author.discriminator}`)})\nFirst of all, do you want to make data such as your mutual servers with ${bot.user.username} and profile fields public?${userDocument.isProfilePublic ? " It's already public right now, by answering yes you're keeping it that way." : ""}`
			}
		}).then(() => {
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				userDocument.isProfilePublic = config.yes_strings.includes(message.content.toLowerCase().trim());
				userDocument.save(err => {
					if(err) {
						winston.error("Failed to save user data for profile setup", {usrid: msg.author.id}, err);
					}
					msg.channel.createMessage({
						embed: {
							author: {
								name: bot.user.username,
								icon_url: bot.user.avatarURL,
								url: "https://github.com/GilbertGobbels/GAwesomeBot"
							},
							color: 0x9ECDF2,
							description: `Alright! 😀 Next up, what's the URL of the background image you'd like to use? Currently, it's the image you can see, answer with \`.\` to continue using this.`,
							image: {
								url: `${userDocument.profile_background_image}`
							}
						}
					}).then(() => {
						bot.awaitMessage(msg.channel.id, msg.author.id, message => {
							const askDescription = () => {
								msg.channel.createMessage({
									embed: {
										author: {
											name: bot.user.username,
											icon_url: bot.user.avatarURL,
											url: "https://github.com/GilbertGobbels/GAwesomeBot"
										},
										color: 0x9ECDF2,
										description: "Done, that's your new picture. 🏖 Now, please tell me a little about yourself (max 2000 characters)..."
									}
								}).then(() => {
									bot.awaitMessage(msg.channel.id, msg.author.id, message => {
										if(message.content.trim() == ".") {
											msg.channel.createMessage({
												embed: {
													author: {
															name: bot.user.username,
															icon_url: bot.user.avatarURL,
															url: "https://github.com/GilbertGobbels/GAwesomeBot"
													},
													color: 0x00FF00,
													title: "All set!",
													description: `I would've liked to know more about you, but your profile is all setup! Click [here](${config.hosting_url}activity/users?q=${encodeURIComponent(`${msg.author.username}#${msg.author.discriminator}`)}) to see it. 👀`
												}
											});
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
												msg.channel.createMessage({
													embed: {
														author: {
															name: bot.user.username,
															icon_url: bot.user.avatarURL,
															url: "https://github.com/GilbertGobbels/GAwesomeBot"
														},
														color: 0x00FF00,
														title: "All set!",
														description: `Thanks! Your profile is good to go! 👤 Click [here](${config.hosting_url}activity/users?q=${encodeURIComponent(`${msg.author.username}#${msg.author.discriminator}`)}) to see it. 👀`
													}
												});
											});
										}
									});
								});
							};
							if(message.content.trim() == ".") {
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
	} else if(suffix && suffix.toLowerCase() != "me") {
		if(suffix.indexOf("|") > -1) {
			const args = suffix.split("|");
			if(args.length == 2 && args[0]) {
				const key = args[0].trim();
				const saveUserDocument = () => {
					if (!args[1] == "" || !args[1] == null) {
						userDocument.save(err => {
							if(err) {
								winston.error("Failed to save user data for adding profile field", {usrid: msg.author.id}, err);
								msg.channel.createMessage({
									embed: {
										author: {
											name: bot.user.username,
											icon_url: bot.user.avatarURL,
											url: "https://github.com/GilbertGobbels/GAwesomeBot"
										},
										color: 0xFF0000,
										title: "Error",
										description: "Oops, something went wrong while saving that. 😾"
									}
								});
							} else {
								msg.addReaction("\uD83D\uDC4C");
							}
						});	
					} else {
						msg.channel.createMessage({
							embed: {
								author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
								},
								color: 0xFF0000,
								title: "Error",
								description: `Couldn't save data! Make sure \`${commandData.name} ${suffix}|<value>\` has been used correctly! You need a value to the tag!`
							}
						});
					}
				};
				const setProfileField = remove => {
					if(remove) {
						delete userDocument.profile_fields[key];
					} else {
						if(!userDocument.profile_fields) {
							userDocument.profile_fields = {};
						}
						if(!args[1] == "" || !args[1] == null) {
							userDocument.profile_fields[key] = args[1].trim();
						}
					}
					userDocument.markModified("profile_fields");
					saveUserDocument();
				};
				if(key.toLowerCase() == "location") {
					if(!args[1] || args[1].trim() == ".") {
						userDocument.location = null;
					} else {
						userDocument.location = args[1].trim();
					}
					saveUserDocument();
				} else if(key.toLowerCase() == "weatherunit") {
					if(!args[1] || args[1].trim() == ".") {
						userDocument.weatherunit = null;
						saveUserDocument();
					} else if(args[1].trim().toLowerCase() == "fahrenheit" || args[1].trim().toLowerCase() == "f") {
						userDocument.weatherunit = "Fahrenheit";
						saveUserDocument();
					} else if(args[1].trim().toLowerCase() == "celsius" || args[1].trim().toLowerCase() == "c") {
						userDocument.weatherunit = "Celsius";
						saveUserDocument();
					} else {
						msg.channel.createMessage({
							embed: {
								author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
								},
								color: 0xFF0000,
								description: `Invalid weather unit specified. Please specify either fahrenheit or celsius.`
							}
						});
					}
				} else if(userDocument.profile_fields && userDocument.profile_fields[key]) {
					if(!args[1] || args[1].trim() == ".") {
						setProfileField(true);
					} else {
						msg.channel.createMessage({
							embed: {
								author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
								},
								color: 0x9ECDF2,
								title: "Key already set",
								description: `You've already set ${key} to \`${userDocument.profile_fields[key]}\`. Would you like to overwrite it?`
							}
						}).then(() => {
							bot.awaitMessage(msg.channel.id, msg.author.id, message => {
								if(config.yes_strings.includes(message.content.toLowerCase().trim())) {
									setProfileField()
								}
							});
						});
					}
				} else {
					setProfileField();
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
						author: {
							name: bot.user.username,
							icon_url: bot.user.avatarURL,
							url: "https://github.com/GilbertGobbels/GAwesomeBot"
						},
						color: 0xFF0000,
						title: "Error",
						description: `That's not how you set a field in your profile. Use \`${commandData.name} <key>|<value>\``
					}
				});
			}
		} else {
			if(suffix.toLowerCase() == "location" && userDocument.location) {
				msg.channel.createMessage({
				  embed: {
					author: {
					  name: bot.user.username,
					  icon_url: bot.user.avatarURL,
					  url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					title: "Here's the location you've set",
					description: userDocument.location
				  }
				});
      		} else if(suffix.toLowerCase() == "weatherunit" && userDocument.weatherunit) {
      			msg.channel.createMessage({
				  embed: {
					author: {
					  name: bot.user.username,
					  icon_url: bot.user.avatarURL,
					  url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					title: "Here's the weather unit you've set",
					description: userDocument.weatherunit
				  }
				});
      		} else if(userDocument.profile_fields && userDocument.profile_fields[suffix]) {
				msg.channel.createMessage({
					embed: {
						author: {
							name: bot.user.username,
							icon_url: bot.user.avatarURL,
							url: "https://github.com/GilbertGobbels/GAwesomeBot"
						},
						color: 0x9ECDF2,
						title: `Here's the field for __${suffix}__`,
						description: userDocument.profile_fields[suffix]
					}
				});
			} else {
				msg.channel.createMessage({
					embed: {
						author: {
							name: bot.user.username,
							icon_url: bot.user.avatarURL,
							url: "https://github.com/GilbertGobbels/GAwesomeBot"
						},
						color: 0xFF0000,
						title: "Warning",
						description: `Field \`${suffix}\` is not found in your profile. Set it with \`${commandData.name} ${suffix}|<value>\``
					}
				});
			}
		}
	} else {
		msg.channel.createMessage({
			embed: getUserProfile(bot, config, msg.author, userDocument, msg.author.username)
		});
	}
};
