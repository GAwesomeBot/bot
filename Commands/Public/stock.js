const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		unirest.get(`http://finance.yahoo.com/webservice/v1/symbols/${encodeURIComponent(suffix)}/quote?format=json&view=detail`).headers({
			"Accept": "application/json",
			"User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; MotoG3 Build/MPI24.107-55) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537.36"
		}).end(res => {
			if(res.status==200 && res.body.list.resources[0]) {
				const data = res.body.list.resources[0].resource.fields;
				msg.channel.createMessage(`**📈 ${data.issuer_name} (${data.symbol})**\n\t$${Math.round((data.price)*100)/100}\n\t ${Math.round((data.change)*100)/100} (${Math.round((data.chg_percent)*100)/100}%)\n\t$${Math.round((data.day_low)*100)/100}-$${Math.round((data.day_high)*100)/100}`);
			} else {
				winston.warn(`No stock data found for '${suffix}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("Sorry, I can't find that stock symbol. 📉 See <http://eoddata.com/Symbols.aspx> for a list.");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} Please provide a valid stock symbol. <http://eoddata.com/Symbols.aspx>`);
	}
};