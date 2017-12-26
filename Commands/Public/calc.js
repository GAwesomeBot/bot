const mathjs = require("mathjs");
let safeEval = mathjs.eval;

mathjs.import({
	import: () => { throw new Error(`Function "import" is disabled inside calculations!`); },
	createUnit: () => { throw new Error(`Function "createUnit" is disabled inside calculations!`); },
	eval: () => { throw new Error(`Function "eval" is disabled inside calculations!`); },
	parse: () => { throw new Error(`Function "parse" is disabled inside calculations!`); },
	simplify: () => { throw new Error(`Function "simplify" is disabled inside calculations!`); },
	derivative: () => { throw new Error(`Function "derivative" is disabled inside calculations!`); },
}, { override: true });

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let args = msg.suffix.split(/\s+/);
		if (args[0].trim().toLowerCase() === "help") {
			try {
				let helpstr = mathjs.help(args[1].trim());
				msg.channel.send({
					embed: {
						color: Colors.INFO,
						description: `\`\`\`css\n${helpstr}\`\`\``,
					},
				});
			} catch (err) {
				let description = [
					`Couldn't find any help message for \`${args[1]}\`!`,
					"",
					"We use **[MathJS](http://mathjs.org/)** to calculate your equations!",
					"Read more about what it can and can't do by clicking [here](http://mathjs.org/)",
				].join("\n");
				msg.channel.send({
					embed: {
						color: Colors.SOFT_ERR,
						description,
						footer: {
							text: `Make sure you typed it right!`,
						},
					},
				});
			}
		} else {
			let hrstart = process.hrtime();
			let m = await msg.channel.send({
				embed: {
					color: Colors.INFO,
					title: `Calculating...`,
					description: `This shouldn't take long!`,
				},
			});
			try {
				let res = safeEval(msg.suffix.trim());
				m.edit({
					embed: {
						color: Colors.LIGHT_GREEN,
						title: `Here is your result!`,
						author: {
							name: `Results provided by MathJS`,
							url: `http://mathjs.org/`,
						},
						description: `\`\`\`css\n${res}\`\`\``,
						footer: {
							text: `It took me ${process.hrtime(hrstart)[0]}s and ${Math.floor(process.hrtime(hrstart)[1] / 1000000)}ms to calculate this!`,
						},
					},
				});
			} catch (err) {
				m.edit({
					embed: {
						color: Colors.ERR,
						title: `Something went wrong here...`,
						description: `\`\`\`css\n${err}\`\`\``,
						footer: {
							text: `How did you manage this?!`,
						},
					},
				});
			}
		}
	} else {
		winston.verbose(`No mathematical equation provided for "${commandData.name}" command!`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: `Uhm... What would you like to calculate today? 🤓`,
				description: `I may be smart but I can't guess what you'd want to calculate!`,
			},
		});
	}
};
