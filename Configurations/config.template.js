module.exports = {
	/*
	 * Represents how many shards the bot will have.
	 * Must be either an interger or the string "auto".
	 */
	shardTotal: 1,
	/*
	 * The base URL used in links posted by the bot.
	 * The URL *must* end with a forward slash ("/")
	 */
	hostingURL: "https://dev.gawesomebot.com/",
	/*
	 * The IP the Web Server should bind to.
	 * You should probably leave this as "0.0.0.0" which binds to all incoming connections
	 */
	serverIP: "0.0.0.0",
	/*
	 * The HTTP / HTTPS ports the bot should use.
	 * If you use a reverse proxy which is listening on the default ports these should be changed to something else.
	 * Both values are integers.
	 */
	httpPort: 80,
	httpsPort: 433,
	/*
	 * Certificate / Private Key paths to the cert files, required for HTTPS.
	 * If you are on Windows, make sure to escape the *\*
	 */
	cert: "",
	privateKey: "",
	/*
	 * If the bot should try to automatically redirect to https.
	 * Required a cert and privateKey to exist.
	 */
	httpsRedirect: false,
	/*
	 * Connection options for the database
	 */
	database: {
		/*
		 * The URL pointing to the MongoDB instance GAB should use
		 */
		URL: "mongodb://localhost:27017/",
		/*
		 * The name of the Database GAB should use
		 */
		db: "gabbe",
	},
	/*
	 * Connection options for Sentry error reporting.
	 */
	sentry: {
		dsn: "",
	},
	/*
	 * Direct Discord link to invite your bot. You can replace the permissions, if you know what you are doing.
	 * Otherwise: !! DO NOT TOUCH !!
	 */
	oauthLink: "https://discordapp.com/oauth2/authorize?&client_id={id}&scope=bot&permissions=470281471",
	/*
	 * Minimum log level the console should display. List of available levels:
	 * error, warn, info, debug and verbose.
	 * Recommended to stay at "info" to prevent console cluttering.
	 * `fileLevel` determines the output to master/shard.gawesomebot.log and verbose.gawesomebot.log files.
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
	 * A secure, random password used to encrypt and decrypt some database values.
	 * YOU SHOULD CHANGE THIS.
	 * And DO NOT CHANGE IT AFTERWARDS. Otherwise you will lose access to some of the bot's data.
	 * Use https://passwordsgenerator.net/ to generate something big and secure!
	 */
	encryptionPassword: "fEmH!bRP4S8a4^*fpQ=%",
	/**
	 * An initial value that will be used to encrypt data.
	 * YOU MUST CHANGE THIS.
	 * And whatever you do. DO NOT CHANGE THIS AFTERWARDS.
	 * The encrypted data will be lost otherwise.
	 * So, set it to something secure, then never ever touch it. Save it in a file!
	 * Hell, it can even be a random word! Just remember: never share this.
	 * Make sure it *isn't longer than 16 characters*!
	 * You can use https://passwordsgenerator.net/ to generate an encryption iv.
	 */
	encryptionIv: "usM9^y5KHtF_UCn?",
	/*
	 * Optional: If you want your bot to show an invite link to your guild in the about/help commands.
	 */
	discordLink: "https://discord.gg/NZwzJ9Q",
	/*
	 * Data to populate the donation list on the /donate web page.
	 */
	donateSubtitle: "The GAwesomeBot team currently doesn't accept direct payments. (<a href='/wiki/FAQs#donations'>here's why</a>) Instead, you can use the following methods to support the project!",
	donateCharities: [
		{
			icon_url: "http://i.imgur.com/1C08tFT.png",
			donate_url: "https://github.com/GilbertGobbels/GAwesomeBot",
			name: "Star us on GitHub!",
			country: "WW",
		},
	],
	/*
	 * These last values can remain untouched.
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
