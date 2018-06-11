/* eslint-disable no-useless-concat, no-console */
if (process.platform === "win32") {
	const text = [
		"\u001b[31m" + "[Warning]" + "\u001b[39m" + " You are running Windows!",
		"You may encounter issues while installing GAwesomeBot's Dependencies.",
		"",
		"If you do, please run \"\u001b[32m\u001b[4m" + "npm run windows-install" + "\u001b[24m\u001b[39m\"" + " in an Administrator Command Prompt!",
		"If you are still encountering issues, please submit the logs over at\n\"\u001b[36m\u001b[4m" + "https://github.com/GilbertGobbels/GAwesomeBot" + "\u001b[24m\u001b[39m\"",
	];
	console.log(text.join("\n"));
}
