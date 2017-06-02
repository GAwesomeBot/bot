const wiki = require("wikijs");
const wikipedia = new wiki.default();

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	const showNoResults = title => {
		winston.warn(`No Wikipedia results found for '${title}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage("Wikipedia has nothing 📚🤓");
	};

	const showSummary = page => {
		if(page.raw.pageid==null) {
			showNoResults(page.raw.title);
		} else {
			page.summary().then(summary => {
				if(page.raw.pageprops && page.raw.pageprops.disambiguation!=null) {
					const options = summary.split("\n").slice(1);
					msg.channel.createMessage(`Select one of the following:\n\t${options.map((a, i) => {
						return `${i}) ${a}`;
					}).join("\n\t")}`).then(() => {
						bot.awaitMessage(msg.channel.id, msg.author.id, message => {
							message.content = message.content.trim();
							return message.content && !isNaN(message.content) && message.content>=0 && message.content<options.length;
						}, message => {
							const selection = options[+message.content.trim()];
							wikipedia.page(selection.substring(0, selection.indexOf(","))).then(page => {
								showSummary(page);
							});
						});
					});
				} else {
					bot.sendArray(msg.channel, summary.split("\n").slice(0, 3).concat(`**${page.raw.fullurl}**`));
				}
			});
		}
	};

	const showPage = title => {
		wikipedia.page(title).then(page => {
			showSummary(page);
		});
	};
	
	if(suffix) {
		wikipedia.search(suffix).then(data => {
			if(data.results.length>0) {
				showPage(data.results[0]);
			} else {
				showNoResults(suffix);
			}
		});
	} else {
		wikipedia.random(1).then(results => {
			showPage(results[0]);
		});
	}
};
