const cluster = require("cluster");
const EventEmitter = require("events");

class Shard {
  constructor(id, proc, sharder, worker) {
    this.process = proc;
    this.sharder = sharder;
    this.worker = worker;
    this.id = id;
    
    this.process.once("exit", () => {
      this.sharder.create(this.id);
    });
    
    this.process.on("message", msg => {
      this.sharder.emit(this, msg);
    });
  }
  
  send(msg) {
    return new Promise((resolve, reject) => {
      this.process.send(msg, err => {
        if (err) reject(err); else resolve();
      });
    });
  }
}

class Sharder extends EventEmitter {
  constructor(token, count, winston) {
    super();
    this.cluster = cluster;
    this.cluster.setupMaster({
      exec: "Discord.js"
    });
    this.winston = winston;
    this.token = token;
    this.count = count;
    this.SharderIPC = require("./").SharderIPC;
    this.Collection = require("discord.js").Collection;
    this.IPC = new this.SharderIPC(this, winston);
    this.shards = new this.Collection();
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
  
  broadcast(message) {
    const promises = [];
    for (const shard of this.shards.values()) promises.push(shard.send(message));
    return Promise.all(promises);
  }
}

module.exports = Sharder;