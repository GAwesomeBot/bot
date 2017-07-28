const configs = {
	/*
   * Represents how many shards the bot will have.
   * It *must* be a integer, aka *0*, *52* etc.
   */
	shardTotal: 3,
	/*
   * The URL all the bot commands should point to.
   * Example: /about shows this link for the web interface
   */
	hostingURL: "",
	/*
   * The server IP the web inteface should point itself to.
   * Preferably, you leave it as *0.0.0.0* so that it is on the local machine
   */
	serverIP: "0.0.0.0",
	/*
   * The HTTP / HTTPS ports the bot should use. If you use Cloudflare, you should just keep httpPort to *80*
   * They are both Integers
   */
	httpPort: 80,
	httpsPort: 433,
	/*
   * Certificate / Private Key paths to the files, required for HTTPS.
   * If you are on Windows, make sure to escape the *\*
   */
	cert: "",
	privateKey: "",
	/*
   * If the bot should try to automatically redirect to https.
   * Needs cert and privateKey to be fulfilled
   */
	httpsRedirect: false,
	/*
   * The URL to the database. You should keep it as is, or just rename the *awesomebot* at the end.
   */
	databaseURL: "mongodb://localhost:27017/awesomebot?poolSize=10",
	/*
   * MaxVoiceChannels should remain as is.
   * Same with version
   */
	maxVoiceChannels: 2,
	version: "4.0.2",
	branch: "development",
	/*
   * Direct Discord link to invite your bot. Replace "<REPLACE HERE>" (including the "<>") with your bots ID.
   */
	oauthLink: "https://discordapp.com/oauth2/authorize?&client_id=<REPLACE HERE>&scope=bot&permissions=470019135",
	/*
   * Optional: If you want your bot to have an invite link to your guild, for support or things.
   */
	discordLink: "",
	donateCharities: [

	],
	/*
   * These last values should remain untouched.
   */
	moment_date_format: "ddd MMMM Do YYYY [at] H:mm:ss",
	voteTriggers: [
		" +!",
		" +1",
		" up",
		" ^",
		" thx",
		" ty",
		" thanks",
		" thank you",
		" god bless",
	],
	yesStrings: [
		"k",
		"y",
		"yy",
		"ye",
		"ok",
		"kk",
		"yes",
		"yea",
		"yee",
		"yeah",
		"okay",
		"fine",
		"sure",
	],
};

module.exports = configs;
