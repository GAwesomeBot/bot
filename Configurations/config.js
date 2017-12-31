const configs = {
	/*
   * Represents how many shards the bot will have.
   * It *must* be a integer, aka *1*, *52* etc. OR "auto"
   */
	shardTotal: 1,
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
   */
	maxVoiceChannels: 2,
	/*
   * Direct Discord link to invite your bot. You can replace the permissions, if you know what you are doing.
	 * Otherwise. !! DO NOT TOUCH !!
   */
	oauthLink: "https://discordapp.com/oauth2/authorize?&client_id={id}&scope=bot&permissions=470281471",
	/*
	 * Level of output the console should display. List of levels:
	 * error, warn, info, debug and verbose.
	 * Recommended to stay as info to prevent console cluttering.
	 * fileLevel determines the output to master/shard.gawesomebot.log and verbose.gawesomebot.log files.
	 * Note that setting these values to a level lower than `info` might influence your bot's performance.
	 */
	consoleLevel: "info",
	fileLevel: "info",
	/*
	 * The secret used to sign session hashes.
	 * This must be a random and secure string!
	 * Leaving this as default is NOT recommended.
	 */
	secret: "vFEvmrQl811q2E8CZelg4438l9YFwAYd",
	/**
	 * The password that will be used in the encryption of data
	 * YOU MUST CHANGE THIS.
	 * And whatever you do. DO NOT CHANGE THIS AFTERWARDS.
	 * The encrypted data will be lost otherwise.
	 * So, set it to something secore, then never ever touch it. Save it in a file!
	 * Hell, it can even be a random word! Just remember: never share this.
	 */
	encryptionPassword: "vPuVQ;e!9RH9:&`pSh'Y",
	/*
	 * Discord channel and server where any errors should be outputted,
	 * whenever applicable
	 * debugServer: The server ID of the server
	 * debugChannel: The Channel ID in the server
	 */
	discord: {
		debugServer: ``,
		debugChannel: ``,
	},
	/*
   * Optional: If you want your bot to have an invite link to your guild, for support or things.
   */
	discordLink: "https://discord.gg/NZwzJ9Q",
	donateCharities: [
		{
			icon_url: "http://i.imgur.com/1C08tFT.png",
			donate_url: "https://github.com/GilbertGobbels/GAwesomeBot",
			name: "Star us on GitHub!",
			country: "WW",
		},
	],
	donateSubtitle: "The GAwesomeBot team currently doesn't accept direct payments. (<a href='/wiki/FAQs#donations'>here's why</a>) Instead, you can use the following methods to support the project!",
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
	errorLines: [
		"<strong>Help!</strong> My GAB's on fire!",
		"<strong>Uh-oh</strong>, something went wrong.",
		"<strong>Snap!</strong> Something hit a snag.",
		"<strong>Yaikes</strong>, this isn't good.",
		"<strong>Well</strong>, at least we still have eachother.",
		"<strong>Grr!</strong> I hate it when this happens.",
		"<strong>x.x</strong>, (-_-*) o.O :/",
		"<strong>Argh!</strong> Something went horribly wrong.",
		"<strong>Sigh</strong>, did you break it again?",
		"<strong>Hmm</strong>, this does indeed appear to be bad.",
		"<strong>Yup</strong>, that's an error!",
		"<strong>Hey</strong>, I'm broken!",
		"<strong>Woops</strong>, that one was me.",
		"<strong>Sorry!</strong> I really tried my best!",
		"<strong>Welp</strong>, this is embarrassing.",
	],
};

module.exports = configs;
