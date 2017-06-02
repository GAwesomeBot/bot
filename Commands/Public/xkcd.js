const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	this.fetch = (num, success_cb, error_cb) => {
		num = num || 0;

		let uri = "https://xkcd.com/info.0.json";
		if(num > 0) {
			uri = `https://xkcd.com/${num}/info.0.json`;
		}

		unirest.get(uri).headers({ Accept: "application/json" }).end(result => {
			if(result.status == 200) {
				if(success_cb) {
					success_cb(result);
				}
			}
			else {
				if(error_cb) {
					error_cb(result);
				}
			}
		});
	};

	this.show = comic_data => {
		let output = `#${comic_data.body.num}: __${comic_data.body.title}__`;

		// date
		let month = comic_data.body.month;
		if(month < 10) month = `0${month}`;

		let day = comic_data.body.day;
		if(day < 10) day = `0${day}`;
		output += `   (${comic_data.body.year}-${month}-${day})`;

		output += `\`\`\`${comic_data.body.alt}\`\`\``;
		output += comic_data.body.img;

		msg.channel.createMessage(output);
	};

	this.fetch(null, stat_info => {
		if(suffix) {
			if(!isNaN(suffix) && suffix > 0 && suffix <= stat_info.body.num) {
				// same as latest? no need to make another fetch request
				if(suffix == stat_info.body.num) {
					this.show(stat_info);
					return;
				}

				this.fetch(suffix, comic_data => {
					winston.info(`Successfully fetched xkcd ID: ${suffix}`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					this.show(comic_data);
				}, () => {
					winston.info(`Invalid xkcd ID: ${suffix}`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					msg.channel.createMessage(`Sorry; I cannot find an xkcd comic for the ID: ${suffix}`);
				});
			}
			else {
				winston.info(`Invalid xkcd ID: ${suffix}`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage(`Sorry; I cannot find an xkcd comic for the ID: ${suffix}`);
			}
		}
		else {
			this.show(stat_info);
		}
	});
};
