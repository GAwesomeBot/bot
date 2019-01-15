const { Colors } = require("../Internals/Constants");

module.exports = {
	startTiming: async (serverDocument, member) => {
		// Begin timing voice activity
		const voiceDocument = serverDocument.voice_data.id(member.id);
		if (!voiceDocument) {
			serverDocument.query.push("voice_data", {
				_id: member.id,
				started_timestamp: Date.now(),
			});
		}

		// Remove AFK Messages on User activity
		let changed = false;
		const userDocument = await Users.findOne(member.user.id).catch(err => {
			winston.verbose(`Failed to find user document for resetting global AFK message >.>`, err);
		});
		if (userDocument && userDocument.afk_message) {
			changed = true;
			userDocument.query.set("afk_message", null);
		}
		if (!serverDocument) return;
		const memberDocument = serverDocument.members[member.id];
		if (memberDocument && memberDocument.afk_message) {
			changed = true;
			serverDocument.query.id("members", member.id).set("afk_message", null);
		}
		if (changed) {
			member.send({
				embed: {
					color: Colors.GREEN,
					title: `Welcome back! 🎊`,
					description: `I've removed your AFK message.`,
				},
			}).catch(() => null);
		}

		await serverDocument.save().catch(err => {
			winston.debug(`Failed to save serverDocument for voice stats`, err);
		});
	},
	stopTiming: async (client, guild, serverDocument, member) => {
		const voiceDocument = serverDocument.voice_data.id(member.id);
		if (voiceDocument) {
			let memberDocument = serverDocument.members[member.id];
			if (!memberDocument) {
				serverDocument.query.push("members", { _id: member.id });
				memberDocument = serverDocument.members[member.id];
			}

			serverDocument.query.id("members", member.id).inc("voice", Math.floor((Date.now() - voiceDocument.started_timestamp) / 60000));
			serverDocument.query.pull("voice_data", member.id);
			await client.checkRank(guild, serverDocument, serverDocument.query, member, memberDocument);
			await serverDocument.save().catch(err => {
				winston.debug(`Failed to save serverDocument for voice stats`, err);
			});
		}
	},
};
