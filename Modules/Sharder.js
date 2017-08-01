const cluster = require("cluster");
const SharderIPC = require("./").SharderIPC;

class Shard {
  constructor(id, proc, sharder, worker) {
    this.process = proc;
    this.sharder = sharder;
    this.worker = worker;
    this.id = id;
    
    this.process.once("exit", () => {
      this.sharder.create(this.id)
    });
  }
}

class Sharder {
  constructor(token, count, winston) {
    this.cluster = cluster;
    this.cluster.setupMaster({
      exec: "Discord.js"
    });
    this.winston = winston;
    this.token = token;
    this.count = count;
    this.IPC = new SharderIPC();
    this.shards = new require("discord.js").Collection();
  }
  
  spawn() {
    this.winston.verbose("Spawning shards.")
    for (let i = 0; i < this.count; i++) {
      this.create(i);
    }
  }
  
  create(id) {
    let worker = this.cluster.fork({
      CLIENT_TOKEN: this.token,
      SHARD_ID: id,
      SHARD_COUNT: this.count,
    });
    let shard = new Shard(id, worker.process, this, worker);
    this.shards.set(id, shard);
  }
}