const Updater = require("../../Modules/Updater");
const auth = require("../../Configurations/auth");
const os = require("os");

module.exports = async ({ bot, Constants: { Colors, Perms } }, msg, commandData) => {
	let version = await Updater.get(configJSON.branch, configJSON.version);
	if (msg.suffix) {
		const args = msg.suffix.split(" ");
		if (args.includes("-h") || args.includes("--help")) {
			const fields = [{
				name: "-p, --process",
				value: "Display information about the current shard process",
			}, {
				name: "-v, --version",
				value: "Display information about the GAwesomeBot version",
			}, {
				name: "-d, --discord, --bot",
				value: "Show details about the Discord bot user and client",
			}, {
				name: "-m, --master",
				value: "Display information about the master process",
			}, {
				name: "-o, --os, --operating-system",
				value: "Display information about the Operating System GAwesomeBot is running on",
			}, {
				name: "--perms",
				value: "Show your current permissions within GAwesomeBot",
			}, {
				name: "--no-general",
				value: "Hide general debug information and only show data requested via arguments",
			}];
			if (msg.guild) {
				fields.push({
					name: "-c, --cache",
					value: "Perform a Cache Health Check and include the results (this might lag the debug response)",
				});
			}
			fields.push({
				name: "-h, --help",
				value: "Display this help message, overrides any other arguments passed",
			});
			msg.channel.send({
				embed: {
					color: Colors.INFO,
					title: `The debug command arguments`,
					fields,
				},
			});
		} else {
			const fields = [];
			let showDefault = true;
			if (args.includes("--no-general")) showDefault = false;

			if (args.includes("-p") || args.includes("--process")) {
				fields.push({
					name: "Shard Process Information",
					value: `💎 Process is running **${process.release.name} ${process.version}** (located at **${process.execPath}**) with Process ID **${process.pid}** and Shard ID **${bot.shardID}**, node is running from **${process.cwd()}**
								\n💾 Using a Heap with **${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB** RAM reserved, out of a Resident set of **${Math.ceil(process.memoryUsage().rss / 1000000)}MB**
								\n⏲ Process has been running for **${Math.floor(process.uptime() / 3600)} hours**`,
				});
			}
			if (args.includes("-v") || args.includes("--version")) {
				fields.push({
					name: "GAwesomeBot Version Information",
					value: `💽 Currently running GAwesomeBot **${version.config.name}**, on branch **${version.branch}**
								\n🔄 Version is synced with commit **${version.sha}**, and labeled with unique tag **${version.version}**`,
				});
			}
			if (args.includes("-d") || args.includes("--discord") || args.includes("--bot")) {
				fields.push({
					name: "Bot User Information",
					value: `🆔 GAwesomeBot is using the bot account **${bot.user.tag}**, with ID **${bot.user.id}**
								\n🔌 Connected to Discord with **${Math.floor(bot.ping)}ms** latency, for **${Math.floor(bot.uptime / 3600000)} hours** so far`,
				});
			}
			if (args.includes("-m") || args.includes("--master")) {
				const masterData = await bot.IPC.send("shardData", { noShards: true });
				fields.push({
					name: "Master Process Information",
					value: `💎 Process is running **${process.release.name} ${process.version}** (located at **${process.execPath}**) with Process ID **${masterData.master.PID}**, node is running from **${process.cwd()}**
								\n💾 Using a Resident set of **${Math.ceil(masterData.master.rss)}MB**
								\n🗄 GAwesomeBot's MongoDB has **${masterData.master.users} users**, and **${masterData.master.guilds} guilds** registered. The query took **${masterData.master.ping}ms** to finish
								\n⏲ Process has been running for **${masterData.master.uptime} hours**`,
				});
			}
			if (args.includes("-o") || args.includes("--os") || args.includes("--operating-system")) {
				let platform = process.platform;
				switch (platform) {
					case "win32":
						platform = "Windows";
						break;
					case "darwin":
						platform = "MacOS";
						break;
					case "linux":
						platform = "Linux";
						break;
					default:
						platform = `an unknown Operating System (${process.platform})`;
						break;
				}
				fields.push({
					name: "Operating System Information",
					value: `🖥 Hosted on **${platform}**, using a ${os.cpus().length}-core processor with ${os.arch()} architecture
								\n💾 System has a total of **${Math.ceil(os.totalmem() / 1000000)}MB** RAM, of which **${Math.ceil((os.totalmem() - os.freemem()) / 1000000)}MB** is in use
								\n👤 GAwesomeBot is operated by OS User **${os.userInfo().username}**`,
				});
			}
			if (args.includes("--perms")) {
				const isMaintainer = configJSON.maintainers.includes(msg.author.id);
				const isSudoMaintainer = configJSON.sudoMaintainers.includes(msg.author.id);
				const isHost = process.env.GAB_HOST === msg.author.id;
				if (isHost) {
					fields.push({
						name: "Your Maintainer Permissions",
						value: `🔧 You are **the Host**
									\n⚡ As the current Host, you have unrestricted authority over **all** of GAwesomeBot`,
					});
				} else if (!isMaintainer && !isSudoMaintainer) {
					fields.push({
						name: "Your Maintainer Permissions",
						value: `❌ You are **not** a maintainer`,
					});
				} else {
					let perms = [];
					Object.keys(configJSON.perms).forEach(perm => {
						if (!isMaintainer) return;
						if (!isSudoMaintainer && configJSON.perms[perm] === 2) return;
						if (!isHost && configJSON.perms[perm] === 0) return;
						perms.push(Perms[perm]);
					});
					fields.push({
						name: "Your Maintainer Permissions",
						value: `🔧 You are a **${isSudoMaintainer ? "Sudo " : ""}Maintainer**
									\n⚡ Your permissions:\n\t${perms.join("\n\t")}`,
					});
				}
			}
			if (args.includes("-c") || args.includes("--cache")) {
				const cacheV = bot.cache.get(msg.guild.id);
				const dbV = Servers.findOne({ _id: msg.guild.id }).exec();
				fields.push({
					name: "Cache Health Test",
					value: `${(await cacheV).__v === (await dbV).__v ? `❤ Cache health check **passed** (Documents are synced at version **${(await dbV).__v}**)` : `❗ Cache health check **failed** (Documents are out of sync; Cache: **${(await cacheV).__v}**, DB: **${(await dbV).__v}**)`}`,
				});
			}

			msg.channel.send({
				embed: {
					color: Colors.RESPONSE,
					title: `GAwesomeBot Debug Information`,
					description: showDefault ? `Currently on shard with ID ${bot.shardID}, out of ${process.env.SHARD_COUNT} shards total.
											\nShard's ${process.release.name} process is using ${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB RAM, with PID ${process.pid}.
											\nShard has been connected to Discord for ${Math.floor(bot.uptime / 3600000)} hours, and manages ${bot.guilds.size} guild${bot.guilds.size === 1 ? "" : "s"} with a ping of ${Math.floor(bot.ping)}ms.` : null,
					footer: {
						text: "Use argument '-h' to learn more about debug",
					},
					fields,
				},
			});
		}
	} else {
		msg.channel.send({
			embed: {
				color: Colors.INFO,
				title: `${bot.user.tag} running ${version !== 404 ? `GAwesomeBot version ${version.config.name}` : "an unknown GAwesomeBot version"}`,
				description: `Currently on shard with ID ${bot.shardID}, out of ${process.env.SHARD_COUNT} shards total.
											\nShard's ${process.release.name} process is using ${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB RAM, with PID ${process.pid}.
											\nShard has been connected to Discord for ${Math.floor(bot.uptime / 3600000)} hours, and manages ${bot.guilds.size} guild${bot.guilds.size === 1 ? "" : "s"} with a ping of ${Math.floor(bot.ping)}ms.`,
				footer: {
					text: "Use argument '-h' to learn more about debug",
				},
			},
		});
	}
};
