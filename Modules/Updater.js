const unirest = require("unirest");
const dgr = require("download-github-repo")
const rimraf = require("rimraf")
const fs = require("fs")

module.exports = {
  check: (config, cb) => {
    unirest.get(`https://status.gilbertgobbels.xyz/versions/${config.branch}/check?v=${config.version}`).end( result => {
      if (!result.body["up-to-date"] && !result.body.latest) {
        cb(404);
        return;
      }
      cb(result.body);
    })
  },
  update: (bot, config, io, winston) => {
    winston.info("Preparing for update");
    
    bot.shards.forEach((shard) => {
      shard.disconnect();
    });
    
    config.isUpdating = true;
    
    io.emit("update", "metadata")
    winston.info("Fetching newest version metadata");
    
    unirest.get(`https://status.gilbertgobbels.xyz/versions/${config.branch}/check?v=${config.version}`).end(response => {
        io.emit("update", "downloading")
        winston.info("Downloading newest version from github")
        
        if (!fs.existsSync("./Temp")) fs.mkdirSync("./Temp");
        var tpath = fs.mkdtempSync("./Temp/v-");
        
        var repob = config.branch;
        if (config.branch == "stable") repob = "master";   
      
        dgr("GilbertGobbels/GAwesomeBot#"+repob, tpath, () => {
          var body = response.body.latest;
          
          var filesc = [];
          var files = [];
          for (var ii = 0; ii < body.files.length; ii++) {
            
            if (body.files[ii].substring(0, 14) === "Configuration/") {
              var datan = fs.readFileSync(tpath + "/" + body.files[ii], 'utf8');
              var datao = fs.readFileSync("./" + body.files[ii], 'utf8');
              var p = {
                file: body.files[ii],
                datan,
                datao 
              }
              filesc.push(p)
            } else {
              files.push(body.files[ii])
            }
          }
          
          io.emit("update", "files_conf")
          io.on("confirm", (data) => {
            if (data == "filesc") io.emit("files_conf", filesc);
            else if (data == "files") io.emit("files", files);
          })
          winston.info("Awaiting response from client...");
          
          io.on("files_conf", (files_conf) => {
            winston.info("Installing configuration files")
            for (var iii = 0; iii < files_conf.length; iii++) {
              fs.writeFileSync("./"+files_conf[iii].file, files_conf[iii].data)
            }
                      
            io.emit("update", "files")
          
            winston.info("Awaiting response from client...")
          
            io.on("files", (cfiles) => {
              winston.info("Installing new files")
              io.emit("update", "install")
            
              for (var ki = 0; ki < cfiles.length; ki++) {
                fs.createReadStream(tpath+"/"+cfiles[ki]).pipe(fs.createWriteStream(`./${cfiles[ki]}`));
              }
              
              io.emit("update", "done")
              winston.info("Finishing update")
              
              const configg = JSON.parse(fs.readFileSync("./Configuration/config.json", "utf8"));
              configg.version = body.version;
              fs.writeFileSync("./Configuration/config.json", JSON.stringify(configg, null, 4));
              
              winston.info("Cleaning up")
              
              rimraf(tpath, () => {
                io.emit("update", "finished")
                winston.info("Finished updating. Please restart GAB.")
              })
            })
          })
        })
      }
    )
  },
  get: (branch, version, cb) => {
    unirest.get(`https://status.gilbertgobbels.xyz/versions/${branch}/${version}`).end( res => {
      if (res.code === 404) {
        cb(res.code);
        return;
      }
      cb(res.body)
    })
  }
}