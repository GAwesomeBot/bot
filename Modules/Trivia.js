const defaultTriviaSet = require("./../Configuration/trivia.json");
const levenshtein = require("fast-levenshtein");

module.exports = {
	start: (bot, db, svr, serverDocument, usr, ch, channelDocument, set) => {
		if(channelDocument.trivia.isOngoing) {
			ch.createMessage("There is already an ongoing trivia game in this channel, no need to start one 🏏");
		} else {
			if(set) {
				const triviaSetDocument = serverDocument.config.trivia_sets.id(set);
				if(triviaSetDocument) {
					channelDocument.trivia.set_id = set;
				} else {
					ch.createMessage(`Trivia set \`${set}\` not found. You can add it in the admin console, though!`);
					return;
				}
			} else {
				channelDocument.trivia.set_id = "default";
			}
			channelDocument.trivia.isOngoing = true;
			channelDocument.trivia.past_questions = [];
			channelDocument.trivia.score = 0;
			channelDocument.trivia.responders = [];
			ch.createMessage(`Trivia game started by ${usr.mention} ${set ? (`(set: ${set}) `) : ""}🎮`).then(() => {
				module.exports.next(bot, db, svr, serverDocument, ch, channelDocument);
			});
		}
	},
	next: (bot, db, svr, serverDocument, ch, channelDocument) => {
		if(channelDocument.trivia.isOngoing) {
			const doNext = () => {
				let set = defaultTriviaSet;
				if(channelDocument.trivia.set_id!="default") {
					set = serverDocument.config.trivia_sets.id(channelDocument.trivia.set_id).items;
				}
				if(set) {
					const question = module.exports.question(set, channelDocument);
					if(question) {
						ch.createMessage({
							content: `**${question.question}**\n❓\tCategory: ${question.category}\t\`${bot.getCommandPrefix(svr, serverDocument)}trivia <answer>\``,
							disableEveryone: true
						});
					} else {
						module.exports.end(bot, svr, serverDocument, ch, channelDocument);
					}
				} else {
					module.exports.end(bot, svr, serverDocument, ch, channelDocument);
				}
				serverDocument.save(() => {});
			};

			if(channelDocument.trivia.current_question.answer) {
				ch.createMessage(`The answer was \`${channelDocument.trivia.current_question.answer}\` 😛`).then(doNext);
			} else {
				doNext();
			}
		}
	},
	question: (set, channelDocument) => {
		let question;
		while((!question || channelDocument.trivia.past_questions.includes(question.question)) && channelDocument.trivia.past_questions.length<set.length) {
			question = set.random();
		}
		if(question) {
			channelDocument.trivia.past_questions.push(question.question);
			channelDocument.trivia.current_question.answer = question.answer;
			channelDocument.trivia.current_question.attempts = 0;
		}
		return question;
	},
	answer: (bot, db, svr, serverDocument, usr, ch, channelDocument, response) =>{
		if(channelDocument.trivia.isOngoing) {
			channelDocument.trivia.attempts++;
			let triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			if(!triviaResponderDocument) {
				channelDocument.trivia.responders.push({_id: usr.id});
				triviaResponderDocument = channelDocument.trivia.responders.id(usr.id);
			}
			if(module.exports.check(channelDocument.trivia.current_question.answer, response)) {
				if(channelDocument.trivia.current_question.attempts<=2) {
					channelDocument.trivia.score++;
					triviaResponderDocument.score++;
					if(serverDocument.config.commands.points.isEnabled && svr.members.size>2 && !serverDocument.config.commands.points.disabled_channel_ids.includes(ch.id)) {
						db.users.findOrCreate({_id: usr.id}, (err, userDocument) => {
							if(!err && userDocument) {
								userDocument.points += 5;
								userDocument.save(() => {});
							}
						});
					}
				}
				ch.createMessage(`${usr.mention} got it right! 🎉 The answer is \`${channelDocument.trivia.current_question.answer}\`.`).then(() => {
					channelDocument.trivia.current_question.answer = null;
					module.exports.next(bot, db, svr, serverDocument, ch, channelDocument);
				});
			} else {
				ch.createMessage(`${usr.mention} Nope. 🕸`);
			}
		}
	},
	check: (correct, response) => {
		const compare = answer => {
			answer = answer.toLowerCase().trim();
			if(answer.length<5 || !isNaN(answer.trim())) {
				return response.toLowerCase()==answer;
			}
			return levenshtein.get(response.toLowerCase(), answer)<3;
		};

		const answers = correct.split("|");
		for(let i=0; i<answers.length; i++) {
			if(answers[i] && compare(answers[i])) {
				return true;
			}
		}
		return false;
	},
	end: (bot, svr, serverDocument, ch, channelDocument) => {
		if(channelDocument.trivia.isOngoing) {
			channelDocument.trivia.isOngoing = false;
			channelDocument.trivia.current_question.answer = null;
			let info = `Thanks for playing! 🏆 Y'all got a score of **${channelDocument.trivia.score}** out of ${channelDocument.trivia.past_questions.length}.`;
			if(channelDocument.trivia.responders.length>0) {
				const topResponders = channelDocument.trivia.responders.sort((a, b) => {
					return b.score - a.score;
				});
				let member;
				while(!member && topResponders.length>0) {
					member = svr.members.get(topResponders[0]._id);
					if(!member) {
						topResponders.splice(0, 1);
					}
				}
				if(member && topResponders[0].score) {
					info += ` @${bot.getName(svr, serverDocument, member)} correctly answered the most questions ⭐️`;
				}
			}
			ch.createMessage(info);
		}
	}
};
