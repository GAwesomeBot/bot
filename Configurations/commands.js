const commands = {
  pm: {
    afk: {
      usage: `<"." or message>`
    },
    config: {
      usage: ""
    },
    giveaway: {
      usage: "<server> | <channel>"
    },
    help: {
      usage: `[<command>]`
    },
    join: {
      usage: ``
    },
    poll: {
      usage: `<server> | <channel>`
    },
    profile: {
      usage: `["setup" or <field>] [|] ["." or <value>]`
    },
    remindme: {
      usage: `[to] <reminder> <| or "in"> <time from now>`
    },
    say: {
      usage: `<server> | <channel>`
    },
    servernick: {
      usage: `[<nick>] [ | <server ID>]`
    }
  },
  public: {
    "8ball": {
      usage: `<question>`,
      description: `Predicts the answer to a question`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    about: {
      usage: `[<suggestion> or <bug>]`,
      description: `Information about GAwesomeBot`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `GAwesomeBot ðŸ¤–`
    },
    afk: {
      usage: `[<"."> or <message>]`,
      description: `Display an AFK message for the user when tagged`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    alert: {
      usage: `<message>`,
      description: `Allows members to alert all the server admins`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Moderation âš’`
    },
    anime: {
      usage: `<query> [<limit>]`,
      description: `Searches Anime Shows using Kitsu.io`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    appstore: {
      usage: `<...query>`,
      aliases: ["istore"],
      description: `Searches the Apple App Store for one or more apps`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    archive: {
      usage: `<count> [<last ID>]`,
      description: `Provides a JSON file with the last \`n\` messages in chat`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    avatar: {
      usage: `[<user mention>]`,
      description: `Shows a user's profile picture`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    ban: {
      usage: `<user> [|] [<reason>]`,
      description: `Bans the user from this server and deletes 1 day's worth of messages.`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    calc: {
      usage: `<expression> or "help" <function>`,
      description: `Quickly calculate a mathematical expression`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    cat: {
      usage: ``,
      description: `Random picture of a cat!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    catfact: {
      usage: `[<number of facts>]`,
      description: `Random fact(s) about cats!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    choose: {
      usage: `<option 1> [|] <option 2> [|...]`,
      description: `Randomly chooses from a set of options`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    convert: {
      usage: "<number> <unit> [to] <unit>",
      description: "Converts between units of measurement or currencies",
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: "Utility ðŸ”¦"
    },
    cool: {
      usage: `[<"clear"> or cooldown length]`,
      description: `Sets a command cooldown for the channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    count: {
      usage: `<name> [| "." or "+1" or "-1"]`,
      description: `Keep tallies of various things`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    countdown: {
      usage: `[<event>] [| <time from now>]`,
      description: `Set a countdown for an event`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    ddos: {
      usage: `<@user>`,
      description: `DDoS a user!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    disable: {
      usage: `[...<command> ]`,
      description: `Turns off a command or multiple commands in the channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    dog: {
      usage: ``,
      description: `Random picture of a dog!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    dogfact: {
      usage: `[<number>]`,
      description: `Random fact(s) about dogs!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    e621: {
      usage: `<query> [<limit>]`,
      description: `Searches by tag on e621.net`,
      defaults: {
        isEnabled: false,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `NSFW ðŸ‘¹`
    },
    emoji: {
      usage: `...<emoji>`,
      description: `Provides a larger variant of the chosen emoji(s) (maximum of 6 emojis)`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`,
      aliases: ["jumbo"]
    },
    emotes: {
      usage: `[<custom emoji name> or <custom emoji ID>]`,
      description: `Shows the current emojis on the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    enable: {
      usage: `[<command> <command>...]`,
      description: `Turns on a command or multiple commands in the channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    expand: {
      aliases: ["resolve"],
      usage: `<URL>`,
      description: `Shows you where a URL redirects to, and if the URL is safe to click`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    fortune: {
      usage: `[<category>]`,
      description: `Tells your fortune (not really)`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    fuckoff: {
      usage: `fuckoff <user>`,
      description: `Instantly ban a user with a cool gif!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    games: {
      usage: ``,
      description: `Command that shows the top 10 most-played games by members on the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    gif: {
      usage: `<query>`,
      description: `Gets a GIF from Giphy with the given tag(s)`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: true,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    giveaway: {
      usage: `["enroll" or "join"]`,
      description: `Easy way to randomly give away a secret of sort`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`,
      adminExempt: true
    },
    google: {
      usage: `<query> [<limit>]`,
      description: `Displays Google Search and Knowledge Graph results`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: true,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    help: {
      usage: `[<command>]`,
      description: `Displays help information about what command(s) and extensions you can run`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `GAwesomeBot ðŸ¤–`
    },
    image: {
      usage: `<query> ["random"]`,
      description: `Searches Google Images with the given query and returns the first or a random result`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: true,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    imdb: {
      usage: `[<type>] <query>`,
      description: `Provides movie and TV show data`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    imgur: {
      usage: `<image attachment> and/or <image URLs>`,
      description: `Uploads one or multiple images to Imgur`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    info: {
      usage: ``,
      aliases: ["serverinfo"],
      description: `Lists basic stats about this server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    invite: {
      usage: ``,
      aliases: ["join"],
      description: `Provides the invite link to add the bot to another server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `GAwesomeBot ðŸ¤–`
    },
    joke: {
      usage: ``,
      description: `Tells a random joke!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    kick: {
      usage: `<user> [|] [<reason>]`,
      description: `Kicks a member from the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    list: {
      usage: `[<content> or <item no.>] [|"." or "done" or <content>]`,
      description: `In-chat to-do list`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Utility ðŸ”¦`
    },
    lottery: {
      usage: `"start" or "enroll" or "join" or "."`,
      description: `Hourly GAwesomePoints lottery`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    meme: {
      usage: `"search" <query> or [<meme key>|]<top text>[|<bottom text>]`,
      description: `Generates a dank new meme`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    messages: {
      usage: `[<user or "me">]`,
      description: `Command that shows the top 10 members on the server by messages sent`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    modlog: {
      usage: `"enable" <channel> or "disable" or "remove" <case ID>`,
      description: `Moderation logging utility command`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    mute: {
      usage: `<user> [|] [<reason>]`,
      description: `Mutes a user from sending messages in a channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    nick: {
      usage: `[<user>|][<nickname> or <name>]`,
      description: `Changes a members nickname on the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    nuke: {
      usage: `<search limit> [<content> or ":"<query> or ">"<after ID> or "<"<before ID> or <user>]`,
      description: `Deletes messages in a channel, all or from a user`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    numfact: {
      usage: `[<number>]`,
      description: `Random fact about a number`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    perms: {
      usage: `[<user or role>] [|<permission name>]`,
      description: `Modifies permissions for a role or user in a channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    ping: {
      usage: ``,
      description: `Pings the bot. What more were you expecting?`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `GAwesomeBot ðŸ¤–`
    },
    playstore: {
      usage: `<...query>`,
      aliases: ["gplay"],
      description: `Searches the Google Play Store for one or more apps`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    points: {
      usage: `[<user> or "me"]`,
      description: `Records user points and displays them for individual members`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    pokedex: {
      usage: `<Pokemon Name or Pokedex Number>`,
      description: `Searches the Pokemon species database. I choose you!`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    poll: {
      usage: `[<no. of option>]`,
      description: `Allows users to create live, in-chat polls`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`,
      adminExempt: true
    },
    prefix: {
      usage: `[<new command prefix>]`,
      description: `Changes the prefix for commands ran in a server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    profile: {
      usage: `[<user> or "me"]`,
      description: `An all-in-one command to view information about users`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    quiet: {
      usage: `["all" or <time>]`,
      description: `Turns off the bot in one or all channels. Use "start [all]" to bring back the bot`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    ranks: {
      usage: `[<user or rank>]`,
      description: `Lists the ranks of all members of the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    reason: {
      usage: `<case ID> <reason>`,
      description: `Sets the reason for a modlog entry`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    reddit: {
      usage: `[<subreddit>] [<limit>]`,
      description: `Gets the latest posts from a given subreddit`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    remindme: {
      usage: `"to" <reminder> "in" <time from now>`,
      description: `Reminds you in DMs about things`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    role: {
      aliases: ["roles"],
      usage: `[<name> or "me"] [|] ["." or <hex color> or "reset color" or "hoist" or "joinable" or "mentionable" or <user> or <new role name>]`,
      description: `Adds members to roles, modifies roles or sets colors`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Moderation âš’`
    },
    roleinfo: {
      usage: `[<role>]`,
      description: `Gets informations about roles`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    roll: {
      usage: `[<min>] [<max>]`,
      description: `Generates a random number or rolls a die`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    room: {
      usage: `"text" or "voice" [<user 1>] [<user 2>] [...]`,
      description: `Creates a temporary text or voice channel with a few members`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    rss: {
      usage: `<feed name or URL> [<limit>]`,
      description: `Fetches articles from an RSS feed`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    rule34: {
      usage: `<query> [<limit>]`,
      description: `Searches by tag on rule34.xxx`,
      defaults: {
        isEnabled: false,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `NSFW ðŸ‘¹`
    },
    safebooru: {
      usage: `<query> [<limit>]`,
      description: `Searches by tag on safebooru.org`,
      defaults: {
        isEnabled: false,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `NSFW ðŸ‘¹`
    },
    say: {
      usage: `<text>`,
      description: `Says something in the chat`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Utility ðŸ”¦`
    },
    shorten: {
      usage: `<URL>`,
      description: `Uses bit.ly to shorten an URL`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    softban: {
      usage: `<user> [|] [<reason>]`,
      description: `Bans the user from this server without deleting their messages`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    stats: {
      usage: `["clear"]`,
      description: `Collect data about the most active members, most popular games and commands on the server for each week`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Stats & Points â­ï¸`
    },
    streamers: {
      usage: ``,
      description: `Checks for the configured Twitch or YouTube Gaming streams`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    strike: {
      aliases: ["warn"],
      usage: `<user> [|] [<reason>]`,
      description: `Gives a warning to a user, and adds a modlog entry`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    strikes: {
      aliases: ["warnings"],
      usage: `[<user>]`,
      description: `Shows a users strikes`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    tag: {
      usage: `[<tag name>] [| "." or <new content>]`,
      description: `Quick snippet system`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    time: {
      usage: `[<location> or <user>]`,
      description: `Gets the time in a city or country`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    translate: {
      usage: `<text> <"?" or source language> [to] <target language>`,
      description: `Uses Microsoft Translate to translate a word / phrase into another language`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    trivia: {
      usage: `["start"|<answer>|"skip"/"next"|"end"/"."]`,
      description: `A fun question-and-answer group quiz game`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    twitter: {
      usage: `<user>`,
      description: `Fetches the Twitter timeline for a given user`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    unban: {
      usage: `<user> [|] [<reason>]`,
      description: `Unbans a user from the server`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 3
      },
      category: `Moderation âš’`
    },
    unmute: {
      usage: `<user> [|] [<reason>]`,
      description: `Allows the muted user to speak in the channel`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 1
      },
      category: `Moderation âš’`
    },
    urban: {
      aliases: ["define"],
      description: `Defines the given word from Urban Dictionary`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    weather: {
      usage: `<location> [<unit>]`,
      description: `Gets the current weather and forecast for the given location from MSN Weather`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    wiki: {
      usage: `[<query>]`,
      description: `Shows the first three paragraphs of the Wikipedia article matching the given query`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    wolfram: {
      usage: `<query>`,
      description: `Displays an entire Wolfram|Alpha knowledge page about a given topic or person`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    },
    xkcd: {
      usage: `[<comic ID>]`,
      description: `Fetches today's XKCD comic or by ID`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Fun ðŸŽª`
    },
    year: {
      usage: ``,
      description: `Displays the remaining time until New Year! ðŸŽ‰`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: false,
        adminLevel: 0
      },
      category: `Utility ðŸ”¦`
    },
    youtube: {
      usage: `<query> [<limit>]`,
      description: `Gets a YouTube link with the given query, including channels, videos, and playlists`,
      defaults: {
        isEnabled: true,
        isNSFWFiltered: true,
        adminLevel: 0
      },
      category: `Search & Media ðŸŽ¬`
    }
  },
  shared: {
    // _base: {
    // 	usage: ``,
    // 	description: ``,
    // 	aliases: [],
    //	example: [],
    //  perm: "",
    // },
    eval: {
      usage: `<expression>`,
      description: `Evaluate some JavaScript code`,
      aliases: ["ev"],
      perm: "eval"
    },
    reload: {
      usage: `[<type>"."]<command> or [<type>"."]"*"`,
      description: `Reloads command functions on the current shard!`,
      aliases: ["r"],
      perm: "administration"
    },
    debug: {
      usage: `["-h"]`,
      description: `Provides information about the bot and, optionally, some system architecture information`,
      perm: "none"
    }
  }
};

module.exports = commands;
