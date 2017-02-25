const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let query = suffix;
	let type = "";
	if(query.toLowerCase().indexOf("series ")==0 || query.toLowerCase().indexOf("episode ")==0 || query.toLowerCase().indexOf("movie ")==0) {
		type = `&type=${query.substring(0, query.indexOf(" ")).toLowerCase()}`;
		query = query.substring(query.indexOf(" ")+1);
	}
	if(query) {
		unirest.get(`http://www.omdbapi.com/?t=${encodeURIComponent(query)}&r=json${type}`).header("Accept", "application/json").end(res => {
			if(res.status==200 && res.body.Response=="True") {
				msg.channel.createMessage(`__**${res.body.Title}${type ? "" : (` (${res.body.Type.charAt(0).toUpperCase()}${res.body.Type.slice(1)})`)}**__\`\`\`${res.body.Plot}\`\`\`**Year:** ${res.body.Year}\n**Rated:** ${res.body.Rated}\n**Runtime:** ${res.body.Runtime}\n**Actors:**\n\t${res.body.Actors.replaceAll(", ", "\n\t")}\n**Director:** ${res.body.Director}\n**Writer:** ${res.body.Writer}\n**Genre(s):**\n\t${res.body.Genre.replaceAll(", ", "\n\t")}\n**Rating:** ${res.body.imdbRating} out of ${res.body.imdbVotes} votes\n**Awards:** ${res.body.Awards}\n**Country:** ${res.body.Country}\nhttp://www.imdb.com/title/${res.body.imdbID}/`);
			} else {
				winston.warn(`No IMDB entries found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("Nothing found in IMDB 😶🚫");
			}
		});
	} else {
		winston.warn(`Parameters not provided or invalid for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} U WOT M8... you need to use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};
