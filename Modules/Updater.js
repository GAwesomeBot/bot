const dgr = require("async-dl-github-repo");
const fs = require("fs-nextra");
const snekfetch = require("snekfetch");
// TODO: Use fs.writeJSONAtomic wherever possible

module.exports = {
	check: async config => {
		let res;
		try {
			res = await snekfetch.get(`https://status.gawesomebot.com/api/versions/${config.branch}/check?v=${config.version}`);
		} catch (err) {
			winston.warn(`Failed to check for new updates. ~.~\n`, err);
			throw err;
		}
		if (res) {
			if (!res.body["up-to-date"] && !res.body.latest) {
				winston.debug(`GAB version ${config.version} was not found on branch ${config.branch}, you may need to reinstall GAB in order to use the Updater.`);
				return 404;
			}
			return res.body;
		}
	},
	get: async (branch, version) => {
		let res;
		try {
			res = await snekfetch.get(`https://status.gawesomebot.com/api/versions/${branch}/${version}`);
		} catch (err) {
			winston.warn(`Failed to fetch version metadata. ~.~\n`, err);
			throw err;
		}
		if (res) {
			if (res.status === 404) {
				return 404;
			}
			return res.body;
		}
	},
	update: async (bot, config, io) => {
		winston.info(`Preparing for update...`);

		// TODO: Emit this to all shards
		bot.emit("pre-update");

		config.isUpdating = true;

		io.emit("update", "metadata");
		winston.info(`Fetching newest version metadata..`);

		let res;
		try {
			res = await snekfetch.get(`https://status.gawesomebot.com/versions/${config.branch}/check?v=${config.version}`);
		} catch (err) {
			throw err;
		}
		io.emit("update", "downloading");
		winston.info(`Downloading the newest version from GitHub`);

		if (!await fs.exists("./Temp")) await fs.mkdir("./Temp");
		const tempPath = await fs.mkdtemp("./Temp/v-");
		let repoBranch = config.branch;
		if (config.branc === "stable") repoBranch = "master";

		dgr(`GilbertGobbels/GAwesomeBot#${repoBranch}`, tempPath, async () => {
			const body = res.body.latest;
			const filesc = [];
			const files = [];

			/* eslint-disable no-await-in-loop*/
			// TODO: Gilbert make this use await Promise.all pls
			for (let i = 0; i < body.files.length; i++) {
				// TODO: Gilbert check this pls
				if (body.files[i].substring(0, 13) === "Configurations/") {
					const dataNew = await fs.readFile(`${tempPath}/${body.files[i]}`, "utf8");
					const dataOld = await fs.readFile(`./${body.files[i]}`, "utf8");
					filesc.push({
						file: body.files[i],
						dataNew,
						dataOld,
					});
				} else {
					files.push(body.files[i]);
				}
			}
			/* eslint-enable no-await-in-loop*/
			io.emit("update", "files_conf");
			io.on("confirm", data => {
				if (data === "filesc") io.emit("files_conf", filesc);
				else if (data === "files") io.emit("files", files);
			});

			winston.info(`Awaiting response from client..`);

			io.on("files_conf", async files_conf => {
				winston.info(`Installing configuration files..`);
				const promiseArray = [];
				for (let i = 0; i < files_conf.length; i++) {
					promiseArray.push(fs.writeFile(`./${files_conf[i].file}`, files_conf[i].data));
				}
				await Promise.all(promiseArray);

				io.emit("update", "files");
				winston.info(`Awaiting response from client..`);

				io.on("files", async cfiles => {
					winston.info(`Installing the new files..`);
					io.emit("update", "install");

					for (let i = 0; i < cfiles.length; i++) {
						fs.createReadStream(`${tempPath}/${cfiles[i]}`).pipe(fs.createWriteStream(`./${cfiles[i]}`));
					}

					io.emit("update", "done");
					winston.info(`Finalizing the update..`);

					const configg = JSON.parse(await fs.readFile(`./Configurations/config.json`, "utf8"));
					configg.version = body.version;
					try {
						await fs.writeFile("./Configurations/config.json", JSON.stringify(configg, null, 4));
					} catch (err) {
						winston.verbose(`There has been an error saving the config.json file.. Impossible!`, err);
					}

					winston.info(`Cleaning up..`);

					try {
						await fs.remove(tempPath);
						io.emit("update", "finished");
						winston.info(`Finished updating. Please restart GAwesomeBot.`);
					} catch (err) {
						winston.verbose(`Couldn't remove the temp directory for the updater..`, err);
					}
				});
			});
		});
	},
};
