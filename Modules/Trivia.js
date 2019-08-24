const defaultTriviaSet = require("./../Configurations/trivia.json");
const levenshtein = require("fast-levenshtein");
const { LoggingLevels, Colors } = require("../Internals/Constants");

const questionTitles = [
	"Do you know this one❓",
	"Oh, here's a good one❗",
	"I bet you don't know this one❗",
	"I'd be surprised if you know this❗",
	"What about this one❓",
	"Are you just going to guess this one❓",
	"Maybe skip this tough one❓",
	"Are you sure you're not using Wikipedia at this point❓",
	"Maybe give this easy one to someone else❓",
	"Hey, stop googling❗",
	"Who comes up with these❓",
];

module.exports = class Trivia {
	static async start (client, svr, serverDocument, member, ch, channelDocument, set, msg) {
		const triviaQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("trivia");

		if (channelDocument.trivia.isOngoing) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "There is already an ongoing trivia game in this channel, no need to start one 🏏",
					footer: {
						text: `Run "${svr.commandPrefix}trivia end" to end the current game`,
					},
				},
			}).catch(err => {
				logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
			});
		} else {
			if (set !== "default") {
				const triviaSetDocument = serverDocument.config.trivia_sets.id(set);
				if (triviaSetDocument) {
					triviaQueryDocument.set("set_id", set);
				} else {
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `Trivia set \`${set}\` not found.`,
							footer: {
								text: `An Admin can create one in the Admin Console!`,
							},
						},
					}).catch(err => {
						logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
					});
					return;
				}
			} else {
				triviaQueryDocument.set("set_id", "default");
			}
			triviaQueryDocument.set("isOngoing", true)
				.set("past_questions", [])
				.set("score", 0)
				.set("responders", [])
				.set("current_question", {});
			client.logMessage(serverDocument, LoggingLevels.INFO, `User "${member.tag}" just started a trivia game in channel "${ch.name}"`, ch.id, member.id);
			await msg.send({
				embed: {
					color: Colors.TRIVIA_START,
					description: `Trivia game started by ${member} 🎮`,
					fields: set === "default" ? undefined : [
						{
							name: `Trivia Set`,
							value: `${set}`,
						},
					],
					footer: {
						text: `No cheating! Nobody likes cheaters! 👀`,
					},
				},
			}).catch(err => {
				logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
			});
			await this.next(client, svr, serverDocument, ch, channelDocument);
		}
	}

	static async next (client, svr, serverDocument, ch, channelDocument, msg) {
		if (channelDocument.trivia.isOngoing) {
			const doNext = async () => {
				let set = defaultTriviaSet;
				if (channelDocument.trivia.set_id !== "default") {
					set = serverDocument.config.trivia_sets.id(channelDocument.trivia.set_id).items;
				}
				if (set) {
					const question = await this.question(set, channelDocument, serverDocument.query.id("channels", channelDocument._id).prop("trivia"));
					if (question) {
						ch.send({
							embed: {
								color: 0x3669FA,
								description: questionTitles[Math.floor(Math.random() * questionTitles.length)],
								fields: [
									{
										name: "Category",
										value: `${question.category}`,
									},
									{
										name: "Question",
										value: `${question.question}`,
									},
								],
								footer: {
									text: `${svr.commandPrefix}trivia <answer>`,
								},
							},
						}).catch(err => {
							logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
						});
					} else {
						await this.end(client, svr, serverDocument, ch, channelDocument);
					}
				} else {
					await this.end(client, svr, serverDocument, ch, channelDocument);
				}
			};

			if (channelDocument.trivia.current_question.answer) {
				await msg.send({
					embed: {
						color: 0xff9200,
						description: `The answer was \`${channelDocument.trivia.current_question.answer}\` 😛`,
						footer: {
							text: "Here comes the next one...",
						},
					},
				}).catch(err => {
					logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
				});
				await doNext();
			} else {
				await doNext();
			}
		}
	}

	static question (set, channelDocument, triviaQueryDocument) {
		let question;
		while ((!question || channelDocument.trivia.past_questions.includes(question.question)) && channelDocument.trivia.past_questions.length < set.length) {
			question = set.random;
		}
		if (question) {
			triviaQueryDocument.push("past_questions", question.question)
				.set("current_question.answer", question.answer)
				.set("current_question.attempts", 0);
		}
		return question;
	}

	static async answer (client, svr, serverDocument, usr, ch, channelDocument, response, msg) {
		if (channelDocument.trivia.isOngoing) {
			const triviaQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("trivia");

			triviaQueryDocument.inc("attempts");
			let triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			if (!triviaResponderDocument) {
				triviaQueryDocument.push("responders", { _id: usr.id });
				triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			}
			const triviaResponderQueryDocument = triviaQueryDocument.clone.id("responders", usr.id);

			if (await this.check(channelDocument.trivia.current_question.answer, response)) {
				let pointsAwarded = false;
				if (channelDocument.trivia.current_question.attempts <= 2) {
					triviaQueryDocument.inc("score");
					triviaResponderQueryDocument.inc("score");
					if (serverDocument.config.commands.points.isEnabled && svr.members.size > 2 && !serverDocument.config.commands.points.disabled_channel_ids.includes(ch.id)) {
						const userDocument = await Users.findOne(usr.id);
						if (userDocument) {
							userDocument.query.inc("points", 5);
							await userDocument.save();
						}
					}
					pointsAwarded = true;
				}
				await msg.send({
					embed: {
						color: 0x50ff60,
						description: `${usr} got it right! 🎉 The answer was \`${channelDocument.trivia.current_question.answer}\`.`,
						footer: {
							text: pointsAwarded ? `They scored a point!` : `That wasn't worth any points, too bad!`,
						},
					},
				});
				triviaQueryDocument.set("current_question.answer", null);
				await this.next(client, svr, serverDocument, ch, channelDocument);
			} else {
				msg.send({
					content: `${usr},`,
					embed: {
						color: Colors.INVALID,
						title: `Nope. 🕸`,
						footer: {
							text: `Try again! "${svr.commandPrefix}trivia <answer>"`,
						},
					},
				});
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

	static async end (client, svr, serverDocument, ch, channelDocument, msg) {
		const triviaQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("trivia");

		if (channelDocument.trivia.isOngoing) {
			triviaQueryDocument.set("isOngoing", false);
			triviaQueryDocument.set("current_question.answer", null);
			let info = `Y'all got a score of **${channelDocument.trivia.score}** out of ${channelDocument.trivia.past_questions.length}.`;

			if (channelDocument.trivia.responders.length > 0) {
				const topResponders = channelDocument.trivia.responders.sort((a, b) => b.score - a.score);
				let member;

				while (!member && topResponders.length > 0) {
					member = svr.members.get(topResponders[0]._id);
					if (!member) {
						topResponders.slice(0, 1);
					}
				}

				if (member && topResponders[0].score) {
					info += `\n@**${client.getName(serverDocument, member)}** correctly answered the most questions! ⭐️`;
				}
			}

			msg.send({
				embed: {
					color: Colors.TRIVIA_END,
					title: `Thanks for playing! 🏆`,
					description: info,
					footer: {
						text: `Can't get enough? Run "${svr.commandPrefix}trivia start" to start again!`,
					},
				},
			}).catch(err => {
				logger.debug("Failed to send Trivia message to channel.", { svrid: svr.id, chid: ch.id }, err);
			});
		}
	}
};
