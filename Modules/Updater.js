const dgr = require("async-dl-github-repo");
const fs = require("fs-nextra");
const snekfetch = require("snekfetch");
const Console = require("./Console");
// TODO: Use fs.writeJSONAtomic wherever possible

module.exports = {
	check: async (config = configJSON) => {
		let res;
		try {
			res = await snekfetch.get(`https://status.gawesomebot.com/api/versions/${config.branch}/check?v=${config.version}`);
		} catch (err) {
			winston.warn(`Failed to check for new updates. ~.~\n`, err);
			throw err;
		}
		if (res) {
			if (!res.body["up-to-date"] && !res.body.latest) {
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
			res = {};
			res.status = 404;
		}
		if (res) {
			if (res.status === 404) {
				return 404;
			}
			return res.body;
		}
	},
	update: async (bot, config, io) => {
		io.isUpdateFinished = false;
		const winston = new Console("Updater");
		winston.info(`Preparing for update...`);
		await bot.IPC.send("updating", {});
		config.isUpdating = true;

		io.emit("update", "metadata");
		winston.info(`Fetching latest version metadata...`);

		let res;
		try {
			res = await snekfetch.get(`https://status.gawesomebot.com/api/versions/${config.branch}/check?v=${config.version}`);
		} catch (err) {
			winston.error("An error occurred while fetching version metadata ~.~\n", err);
		}

		io.emit("update", "downloading");
		winston.info(`Downloading latest version files from GitHub...`);

		if (!await fs.exists("./Temp")) await fs.mkdir("./Temp");
		const tempPath = await fs.mkdtemp("./Temp/v-");
		let repoBranch = config.branch;
		if (config.branch === "stable") repoBranch = "master";

		try {
			await dgr(`GilbertGobbels/GAwesomeBot#${repoBranch}`, tempPath);
		} catch (err) {
			winston.error("An error occurred while downloading latest version files ~.~\n", err);
			return;
		}

		const body = res.body.latest;
		const filesc = [];
		const files = [];
		const rmfiles = [];

		await Promise.all(body.files.map(async file => {
			if (file.startsWith("Configuration")) {
				let dataOld = "This is a new configuration file.";
				if (!await fs.exists(`${tempPath}/${file}`)) return rmfiles.push(file);
				if (await fs.exists(`./${file}`)) dataOld = await fs.readFile(`./${file}`, "utf8");
				filesc.push({
					file,
					dataNew: await fs.readFile(`${tempPath}/${file}`, "utf8"),
					dataOld,
				});
			} else {
				if (!await fs.exists(`${tempPath}/${file}`)) return rmfiles.push(file);
				files.push(file);
			}
		}));

		io.on("confirm", data => {
			if (data === "filesc") io.emit("files_conf", filesc);
			else if (data === "files") io.emit("files", files);
		});
		winston.info(`Awaiting response from client...`);

		io.emit("update", "files_conf");
		io.on("files_conf", async files_conf => {
			winston.info(`Installing configuration files...`);
			const promiseArray = [];
			files_conf.map(file => {
				promiseArray.push(fs.writeFile(`./${file.file}`, file.data));
			});
			await Promise.all(promiseArray);

			io.on("files", async fileres => {
				winston.info(`Installing latest version files...`);
				io.emit("update", "install");

				fileres.forEach(file => {
					fs.createReadStream(`${tempPath}/${file}`).pipe(fs.createWriteStream(`./${file}`));
				});
				await Promise.all(rmfiles.map(async file => {
					if (await fs.exists(file)) return fs.unlink(file);
				}));

				io.emit("update", "done");
				winston.info(`Finishing update...`);

				const configNew = JSON.parse(await fs.readFile(`./Configurations/config.json`, "utf8"));
				configNew.version = body.version;
				try {
					await fs.writeFile("./Configurations/config.json", JSON.stringify(configNew, null, 4));
				} catch (err) {
					winston.error(`An error occurred while finishing the update ~.~\n`, err);
				}

				winston.info(`Cleaning up...`);

				try {
					await fs.remove(tempPath);
					io.emit("update", "finished");
					io.isUpdateFinished = true;
					winston.info(`Finished updating. Please restart GAwesomeBot.`);
					bot.IPC.send("shutdown", { err: false });
				} catch (err) {
					winston.warn(`Failed to remove the Temp directory for update files:`, err);
				}
			});

			winston.info(`Awaiting response from client...`);
			io.emit("update", "files");
		});
	},
};
