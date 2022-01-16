import fs from "fs";

import Discord from "discord.js";

const requireFunc =
  typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;
const config = requireFunc("./config.json");

const toUpperFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

process.on("unhandledRejection", (err) => {
  console.error("Uncaught Promise Error: \n" + err.stack);
});

process.on("error", (err) => {
  console.error("Uncaught Error: \n" + err.stack);
});

console.log("Preloading...");

let questions = {};

const questionsFilename = "metadata/questions.json";
if (fs.existsSync(questionsFilename)) {
  const questionsMetadata = fs.readFileSync(questionsFilename);
  questions = JSON.parse(questionsMetadata);
}

console.log("Preloading... [OK]");

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // // every 3h random message disabled
  // const channel = client.channels.get(config.channel.quotes);
  // setInterval(
  //     () => {
  //         const text = allquotes[Math.floor((Math.random() * allquotes.length))];
  //         const dialog = `${text.value}`;
  //         const quote = '```' + dialog + '```' + `*\`LBA2 (#${text.index})\`*`;
  //         channel.send(quote);
  //     },
  //     10800000 // every 3h
  // );
});

client.on("message", (message) => {
  // ignore other bots or itself
  if (message.author.bot) {
    return;
  }

  // check if message starts with our prefix >
  if (message.content.indexOf(config.prefix) !== 0) {
    return;
  }

  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  const run = (c, a) => {
    try {
      switch (c) {
        case "ping":
          message.reply("pong");
          break;

        case "trivia":
          // const fields = [
          //   {
          //     name: "Race",
          //     value: character.race,
          //     inline: true,
          //   },
          // ];
          let game = `lba${Math.random() > 0.5 ? 2 : 1}`;
          if (a.length == 1) {
            game = a[0];
          }
          const index = parseInt(Math.random() * questions[game].length);
          const obj = questions[game][index];

          message.channel.send({
            embed: {
              description: "```" + obj.question + "```",
              footer: {
                text: `${game.toUpperCase()} | ${index}`,
              },
              // thumbnail,
              // author,
              // fields,
            },
          });
          break;

        case "add":
          if (a.length >= 2) {
            const game = a[0].toLowerCase();
            const question = a.slice(1).join(" ");

            if (game != "lba1" && game != "lba2") {
              message.reply(`${game} is not a valid game type.`);
              break;
            }

            const obj = {
              type: "question",
              question,
            };

            questions[game].push(obj);
            const index = questions[game].length - 1;

            fs.writeFileSync(
              "metadata/questions.json",
              JSON.stringify(questions, null, 2)
            );
            message.reply(`Trivia question ${index} for ${game} added!!`);
            break;
          }

          message.reply(
            "trivia command needs 3 arguments, game (lba1|lba2), question and [optional answer or list of answers]"
          );
          break;
      }
    } catch (ex) {
      console.log(ex);
    }
  };

  run(command, args);
});

client.on("disconnect", async () => {
  client.destroy();
  client.login(config.token);
});

client.on("error", (err) => console.log(err));

client.login(config.token);
