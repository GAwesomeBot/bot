const defaultTriviaSet = require("./../Configurations/trivia.json");
const levenshtein = require("fast-levenshtein");

module.exports = class Trivia {
	static async start (bot, db, svr, serverDocument, member, ch, channelDocument, set) {
		if (channelDocument.trivia.isOngoing) {
			ch.send({
				embed: {
					color: 0xff473b,
					description: "There is already an ongoing trivia game in this channel, no need to start one 🏏",
					footer: {
						text: `Run \`${bot.getCommandPrefix(svr, serverDocument)}trivia end\` to end the current game`,
					},
				},
			});
		} else {
			if (set) {
				const triviaSetDocument = serverDocument.config.trivia_sets.id(set);
				if (triviaSetDocument) {
					channelDocument.trivia.set_id = set;
				} else {
					ch.send({
						color: 0xff473b,
						description: `Trivia set \`${set}\` not found. An admin can add it in the admin console, though!`,
					});
					return;
				}
			} else {
				channelDocument.trivia.set_id = "default";
			}
			channelDocument.trivia.isOngoing = true;
			channelDocument.trivia.past_questions = [];
			channelDocument.trivia.score = 0;
			channelDocument.trivia.responders = [];
			bot.logMessage(serverDocument, "info", `User "${member}" just started a trivia game in channel "${ch.name}"`, ch.id, member.id);
			ch.send({
				color: 0x50ff60,
				description: `Trivia game started by ${member} ${set ? `(set: ${set})` : ""}🎮`,
				footer: {
					text: `No cheating, nobody likes cheaters`,
				},
			}).then(() => this.next(bot, db, svr, serverDocument, ch, channelDocument));
		}
	}

	static async next (bot, db, svr, serverDocument, ch, channelDocument) {
		if (channelDocument.trivia.isOngoing) {
			const doNext = () => {
				let set = defaultTriviaSet;
				if (channelDocument.trivia.set_id !== "default") {
					set = serverDocument.config.trivia_sets.id(channelDocument.trivia.set_id).items;
				}
				if (set) {
					const question = this.question(set, channelDocument);
					if (question) {
						ch.send({
							embed: {
								color: 0x2b67ff,
								description: `**${question.question}**\n❓\tCategory: ${question.category}`,
								footer: {
									text: `${bot.getCommandPrefix(svr, serverDocument)}trivia <answer>`,
								},
							},
							disableEveryone: true,
						});
					} else {
						this.end(bot, svr, serverDocument, ch, channelDocument);
					}
				} else {
					this.end(bot, svr, serverDocument, ch, channelDocument);
				}
				serverDocument.save();
			};

			if (channelDocument.trivia.current_question.answer) {
				ch.send({
					color: "#ff9200",
					description: `The answer was \`${channelDocument.trivia.current_question.answer}\` 😛`,
					footer: {
						text: "Here comes the next one...",
					},
				}).then(doNext);
			} else {
				doNext();
			}
		}
	}

	static async question (set, channelDocument) {
		let question;
		while ((!question || channelDocument.trivia.past_questions.includes(question.question)) && channelDocument.trivia.past_questions.length < set.length) {
			question = set.random();
		}
		if (question) {
			channelDocument.trivia.past_questions.push(question.question);
			channelDocument.trivia.current_question.answer = question.answer;
			channelDocument.trivia.current_question.attempts = 0;
		}
		return question;
	}

	static async answer (bot, db, svr, serverDocument, usr, ch, channelDocument, response) {
		if (channelDocument.trivia.isOngoing) {
			channelDocument.trivia.attempts++;
			let triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			if (!triviaResponderDocument) {
				channelDocument.trivia.responders.push({ _id: usr.id });
				triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			}

			if (this.check(channelDocument.trivia.current_question.answer, response)) {
				if (channelDocument.trivia.current_question.attempts <= 2) {
					channelDocument.trivia.score++;
					triviaResponderDocument.score++;
					if (serverDocument.config.commands.points.isEnabled && svr.members.size > 2 && !serverDocument.config.commands.points.disabled_channel_ids.includes(ch.id)) {
						const findDocument = await db.users.findOrCreate({ _id: usr.id }).catch(err => err);
						if (findDocument.doc) {
							findDocument.doc.points += 5;
							findDocument.doc.save();
						}
					}
				}
				ch.send({
					color: 0x50ff60,
					description: `${usr} got it right! 🎉 The answer is \`${channelDocument.trivia.current_question.answer}\`.`,
					footer: {
						text: "Get ready for the next one...",
					},
				}).then(() => {
					channelDocument.trivia.current_question.answer = null;
					this.next(bot, db, svr, serverDocument, ch, channelDocument);
				});
			} else {
				ch.send(`${usr.mention} Nope. 🕸`);
			}
		}
	}

	static async check (correct, response) {
		const compare = answer => {
			answer = answer.toLowerCase().trim();
			if (answer.length < 5 || !isNaN(answer.trim())) {
				return response.toLowerCase() === answer;
			}
			return levenshtein.get(response.toLowerCase(), answer) < 3;
		};

		const answers = correct.split("|");
		for (let i = 0; i < answers.length; i++) {
			if (answers[i] && compare(answers[i])) {
				return true;
			}
		}
		return false;
	}

	static async end (bot, svr, serverDocument, ch, channelDocument) {
		if (channelDocument.trivia.isOngoing) {
			channelDocument.trivia.isOngoing = false;
			channelDocument.trivia.current_question.answer = null;
			let info = `Thanks for playing! 🏆 Y'all got a score of **${channelDocument.trivia.score}** out of ${channelDocument.trivia.past_questions.length}.`;

			if (channelDocument.trivia.responders.length > 0) {
				const topResponders = channelDocument.trivia.responders.sort((a, b) => {
					return b.score - a.score;
				});
				let member;

				while (!member && topResponders.length > 0) {
					member = svr.members.get(topResponders[0]._id);
					if (!member) {
						topResponders.slice(0, 1);
					}
				}

				if (member && topResponders[0].score) {
					info += ` @${bot.getName(svr, serverDocument, member)} correctly answered the most questions ⭐️`;
				}
			}

			ch.send({
				color: 0x2b67ff,
				description: info,
				footer: {
					text: `Can't get enough? Run \`${bot.getCommandPrefix(svr, serverDocument)}trivia start\` to start again!`,
				},
			});
			serverDocument.save();
		}
	}
};
