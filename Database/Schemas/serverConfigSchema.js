const Schema = require("../Schema");
const { public: commands } = require("../../Configurations/commands.js");

// Get command(s) structure for server config schema below
const getCommands = () => {
	const commandsStructure = {};
	for (const command in commands) {
		commandsStructure[command] = new Schema({
			isEnabled: {
				type: Boolean,
				default: commands[command].defaults.isEnabled,
			},
			admin_level: {
				type: Number,
				default: commands[command].defaults.adminLevel,
				min: 0,
				max: 4,
			},
			disabled_channel_ids: [String],
		});
	}
	return commandsStructure;
};

// Server configs (commands, admins, etc..)
module.exports = new Schema({
	admins: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		level: {
			type: Number,
			default: 1,
			enum: [1, 2, 3],
		},
	})],
	blocked: [String],
	chatterbot: new Schema({
		isEnabled: {
			type: Boolean,
			default: true,
		},
		disabled_channel_ids: [String],
	}),
	command_cooldown: {
		type: Number,
		default: 0,
		min: 0,
		max: 300000,
	},
	command_fetch_properties: new Schema({
		default_count: {
			type: Number,
			default: 3,
			min: 1,
			max: 10,
		},
		max_count: {
			type: Number,
			default: 5,
			min: 1,
			max: 25,
		},
	}),
	command_prefix: {
		type: String,
		default: "@mention",
		maxlength: 25,
		minlength: 1,
	},
	commands: new Schema(getCommands()),
	count_data: [new Schema({
		_id: {
			type: String,
			required: true,
			lowercase: true,
		},
		value: {
			type: Number,
			default: 0,
			min: 0,
		},
	})],
	countdown_data: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		channel_id: {
			type: String,
			required: true,
		},
		expiry_timestamp: {
			type: Date,
			required: true,
		},
	})],
	custom_api_keys: new Schema({
		google_api_key: String,
		google_cse_id: String,
		imgur_client_id: String,
	}),
	custom_roles: [String],
	delete_command_messages: {
		type: Boolean,
		default: false,
	},
	list_data: [new Schema({
		_id: {
			type: Number,
			required: true,
		},
		content: {
			type: String,
			required: true,
		},
		isCompleted: {
			type: Boolean,
			default: false,
		},
	})],
	message_of_the_day: new Schema({
		isEnabled: {
			type: Boolean,
			default: false,
		},
		message_content: {
			type: String,
			maxlength: 2000,
		},
		channel_id: String,
		interval: {
			type: Number,
			default: 86400000,
			min: 300000,
			max: 172800000,
		},
		last_run: Date,
	}),
	moderation: new Schema({
		isEnabled: {
			type: Boolean,
			default: false,
		},
		filters: new Schema({
			spam_filter: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				disabled_channel_ids: [String],
				message_sensitivity: {
					type: Number,
					default: 5,
					enum: [3, 5, 10],
				},
				action: {
					type: String,
					default: "mute",
					enum: ["none", "block", "mute", "kick", "ban"],
				},
				delete_messages: {
					type: Boolean,
					default: true,
				},
				violator_role_id: {
					type: String,
					default: "",
				},
			}),
			mention_filter: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				disabled_channel_ids: [String],
				mention_sensitivity: {
					type: Number,
					default: 3,
					min: 1,
					max: 25,
				},
				include_everyone: {
					type: Boolean,
					default: false,
				},
				action: {
					type: String,
					default: "mute",
					enum: ["none", "block", "mute", "kick", "ban"],
				},
				delete_message: {
					type: Boolean,
					default: true,
				},
				violator_role_id: {
					type: String,
					default: "",
				},
			}),
			nsfw_filter: new Schema({
				isEnabled: {
					type: Boolean,
					default: true,
				},
				disabled_channel_ids: [String],
				action: {
					type: String,
					default: "block",
					enum: ["none", "block", "mute", "kick", "ban"],
				},
				delete_message: {
					type: Boolean,
					default: true,
				},
				violator_role_id: {
					type: String,
					default: "",
				},
			}),
			custom_filter: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				keywords: [String],
				disabled_channel_ids: [String],
				action: {
					type: String,
					default: "mute",
					enum: ["none", "block", "mute", "kick", "ban"],
				},
				delete_message: {
					type: Boolean,
					default: true,
				},
				violator_role_id: {
					type: String,
					default: "",
				},
			}),
		}),
		status_messages: new Schema({
			server_name_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			server_icon_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			server_region_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			new_member_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			new_member_pm: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				message_content: String,
			}),
			member_online_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			member_streaming_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				enabled_user_ids: [String],
			}),
			member_offline_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			member_username_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			member_nick_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			member_avatar_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			member_game_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
			}),
			member_rank_updated_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				type: {
					type: String,
					default: "message",
					enum: ["message", "pm"],
				},
			}),
			member_removed_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			member_removed_pm: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				message_content: String,
			}),
			member_banned_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			member_unbanned_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				channel_id: String,
				messages: [String],
			}),
			message_edited_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				type: {
					type: String,
					default: "msg",
					enum: ["msg", "single"],
				},
				channel_id: String,
				enabled_channel_ids: [String],
			}),
			message_deleted_message: new Schema({
				isEnabled: {
					type: Boolean,
					default: false,
				},
				type: {
					type: String,
					default: "msg",
					enum: ["msg", "single"],
				},
				channel_id: String,
				enabled_channel_ids: [String],
			}),
		}),
		new_member_roles: [String],
		autokick_members: new Schema({
			isEnabled: {
				type: Boolean,
				default: false,
			},
			max_inactivity: {
				type: Number,
				default: 172800000,
				min: 7200000,
				max: 2592000000,
			},
		}),
	}),
	name_display: new Schema({
		use_nick: {
			type: Boolean,
			default: false,
		},
		show_discriminator: {
			type: Boolean,
			default: false,
		},
	}),
	public_data: new Schema({
		isShown: {
			type: Boolean,
			default: true,
		},
		server_listing: new Schema({
			isEnabled: {
				type: Boolean,
				default: false,
			},
			category: {
				type: String,
				default: "Other",
				enum: [
					"Gaming",
					"Tech",
					"Programming",
					"Community",
					"Bots",
					"Other",
				],
			},
			description: {
				type: String,
				maxlength: 3000,
			},
			invite_link: String,
		}),
	}),
	ranks_list: [new Schema({
		_id: {
			type: String,
			required: true,
			maxlength: 200,
		},
		max_score: {
			type: Number,
			min: 1,
			required: true,
		},
		role_id: String,
	})],
	room_data: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		created_timestamp: {
			type: Date,
			default: Date.now,
		},
	})],
	room_category: {
		type: String,
		required: false,
	},
	rss_feeds: [new Schema({
		_id: {
			type: String,
			required: true,
			lowercase: true,
			maxlength: 50,
		},
		url: {
			type: String,
			required: true,
		},
		streaming: new Schema({
			isEnabled: {
				type: Boolean,
				default: false,
			},
			enabled_channel_ids: [String],
			last_article_title: String,
		}),
	})],
	streamers_data: [new Schema({
		_id: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: ["twitch", "ytg"],
		},
		channel_id: String,
		live_state: {
			type: Boolean,
			default: false,
		},
	})],
	tag_reaction: new Schema({
		isEnabled: {
			type: Boolean,
			default: false,
		},
		messages: [String],
	}),
	tags: new Schema({
		list: [new Schema({
			_id: {
				type: String,
				required: true,
				lowercase: true,
				maxlength: 200,
			},
			content: {
				type: String,
				required: true,
				maxlength: 2048,
			},
			isCommand: {
				type: Boolean,
				default: false,
			},
			isLocked: {
				type: Boolean,
				default: false,
			},
		})],
		listIsAdminOnly: {
			type: Boolean,
			default: false,
		},
		addingIsAdminOnly: {
			type: Boolean,
			default: false,
		},
		addingCommandIsAdminOnly: {
			type: Boolean,
			default: true,
		},
		removingIsAdminOnly: {
			type: Boolean,
			default: false,
		},
		removingCommandIsAdminOnly: {
			type: Boolean,
			default: true,
		},
	}),
	translated_messages: [new Schema({
		_id: {
			type: String,
			required: true,
			maxlength: 50,
		},
		source_language: {
			type: String,
			required: true,
			minlength: 2,
			maxlength: 6,
		},
		enabled_channel_ids: [String],
	})],
	trivia_sets: [new Schema({
		_id: String,
		items: [new Schema({
			category: {
				type: String,
				required: true,
			},
			question: {
				type: String,
				required: true,
			},
			answer: {
				type: String,
				required: true,
			},
		})],
	})],
	voicetext_channels: [String],
	ban_gif: {
		type: String,
		default: "https://i.imgur.com/3QPLumg.gif",
	},
});
