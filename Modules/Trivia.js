const defaultTriviaSet = require("./../Configurations/trivia.json");
const levenshtein = require("fast-levenshtein");
const { LoggingLevels, Colors } = require("../Internals/Constants");

const questionTitles = [
	"Do you know this one❓",
	"Oh, here's a good one❗",
	"I bet you don't know this one❗",
	"I'd be surprised if you know this❗",
	"And, what about this one❓",
	"Are you just going to guess this one❓",
	"Maybe skip this tough one❓",
	"Are you sure you're not using Wikipedia at this point❓",
	"Maybe give this easy one to someone else❓",
	"Hey, stop googling! You know who you are❗",
	"Who comes up with these❓",
];

module.exports = class Trivia {
	static async start (bot, svr, serverDocument, member, ch, channelDocument, set) {
		if (channelDocument.trivia.isOngoing) {
			ch.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "There is already an ongoing trivia game in this channel, no need to start one 🏏",
					footer: {
						text: `Run "${svr.commandPrefix}trivia end" to end the current game`,
					},
				},
			});
		} else {
			if (set !== "default") {
				const triviaSetDocument = serverDocument.config.trivia_sets.id(set);
				if (triviaSetDocument) {
					channelDocument.trivia.set_id = set;
				} else {
					ch.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `Trivia set \`${set}\` not found.`,
							footer: {
								text: `An Admin can create one in the Admin Console!`,
							},
						},
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
			bot.logMessage(serverDocument, LoggingLevels.INFO, `User "${member.tag}" just started a trivia game in channel "${ch.name}"`, ch.id, member.id);
			ch.send({
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
			}).then(() => this.next(bot, svr, serverDocument, ch, channelDocument));
		}
	}

	static async next (bot, svr, serverDocument, ch, channelDocument) {
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
						});
					} else {
						this.end(bot, svr, serverDocument, ch, channelDocument);
					}
				} else {
					this.end(bot, svr, serverDocument, ch, channelDocument);
				}
			};

			if (channelDocument.trivia.current_question.answer) {
				ch.send({
					embed: {
						color: 0xff9200,
						description: `The answer was \`${channelDocument.trivia.current_question.answer}\` 😛`,
						footer: {
							text: "Here comes the next one...",
						},
					},
				}).then(doNext);
			} else {
				doNext();
			}
		}
	}

	static question (set, channelDocument) {
		let question;
		while ((!question || channelDocument.trivia.past_questions.includes(question.question)) && channelDocument.trivia.past_questions.length < set.length) {
			question = set.random;
		}
		if (question) {
			channelDocument.trivia.past_questions.push(question.question);
			channelDocument.trivia.current_question.answer = question.answer;
			channelDocument.trivia.current_question.attempts = 0;
		}
		return question;
	}

	static async answer (bot, svr, serverDocument, usr, ch, channelDocument, response) {
		if (channelDocument.trivia.isOngoing) {
			channelDocument.trivia.attempts++;
			let triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			if (!triviaResponderDocument) {
				channelDocument.trivia.responders.push({ _id: usr.id });
				triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			}

			if (await this.check(channelDocument.trivia.current_question.answer, response)) {
				if (channelDocument.trivia.current_question.attempts <= 2) {
					channelDocument.trivia.score++;
					triviaResponderDocument.score++;
					if (serverDocument.config.commands.points.isEnabled && svr.members.size > 2 && !serverDocument.config.commands.points.disabled_channel_ids.includes(ch.id)) {
						const findDocument = await global.Users.findOrCreate({ _id: usr.id }).catch(err => err);
						if (findDocument.doc) {
							findDocument.doc.points += 5;
							findDocument.doc.save();
						}
					}
				}
				ch.send({
					embed: {
						color: 0x50ff60,
						description: `${usr} got it right! 🎉 The answer was \`${channelDocument.trivia.current_question.answer}\`.`,
						footer: {
							text: "Get ready for the next one...",
						},
					},
				}).then(() => {
					channelDocument.trivia.current_question.answer = null;
					this.next(bot, svr, serverDocument, ch, channelDocument);
				});
			} else {
				ch.send({
					content: `${usr},`,
					embed: {
						color: Colors.INVALID,
						title: `Nope. 🕸`,
						footer: {
							text: `Try again! "${svr.commandPrefix}trivia answer"`,
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

	static async end (bot, svr, serverDocument, ch, channelDocument) {
		if (channelDocument.trivia.isOngoing) {
			channelDocument.trivia.isOngoing = false;
			channelDocument.trivia.current_question.answer = null;
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
					info += `\n@**${bot.getName(svr, serverDocument, member)}** correctly answered the most questions! ⭐️`;
				}
			}

			ch.send({
				embed: {
					color: Colors.TRIVIA_END,
					title: `Thanks for playing! 🏆`,
					description: info,
					footer: {
						text: `Can't get enough? Run "${svr.commandPrefix}trivia start" to start again!`,
					},
				},
			});
		}
	}
};
