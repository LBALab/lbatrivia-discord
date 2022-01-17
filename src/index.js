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

let questions = [];
const DIFFICULTY_TYPE = [
  'easy',
  'medium',
  'hard',
]

const questionsFilename = "metadata/questions.json";
if (fs.existsSync(questionsFilename)) {
  const questionsMetadata = fs.readFileSync(questionsFilename);
  questions = JSON.parse(questionsMetadata);
}

console.log("Preloading... [OK]");

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // every 5h random message disabled
  const channel = client.channels.get(config.channel.quotes);
  setInterval(
      () => {
          const index = Math.floor((Math.random() * questions.length));
          const obj = questions[index];
          const question = `${obj.question}`;
          const quote = '```' + question + '```' + `*\`LBA${obj.game} (#${index})\`*`;
          channel.send(quote);
      },
      18000000 // every 5h
  );
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
        case 'ping':
          message.reply("pong");
          break;

        case 'question':
        case 'trivia': {
          let filteredQuestions = [...questions];
          let game = `lba${Math.random() > 0.5 ? 2 : 1}`;
          let difficulty = DIFFICULTY_TYPE[parseInt(Math.random() * 3)];
          if (a.length >= 1) {
            game = a[0];
            filteredQuestions = filteredQuestions.filter((q) => q.game === game);
            if (a.length >= 2) {
              difficulty = a[1];
              filteredQuestions = filteredQuestions.filter((q) => q.difficulty === difficulty);
            }
          }
          let index = parseInt(Math.random() * filteredQuestions.length);
          const obj = filteredQuestions[index];
          const fields = [
            {
              name: "#",
              value: index,
              inline: true,
            },
            {
              name: "Game",
              value: obj.game,
              inline: true,
            },
            {
              name: "Difficulty",
              value: obj.difficulty,
              inline: true,
            },
          ];

          if (obj) {
            message.channel.send({
              embed: {
                description: "```" + obj.question + "```",
                // footer: {
                //   text: `${obj.game.toUpperCase()} | ${index}`,
                // },
                // thumbnail,
                // author,
                fields,
              },
            });
          } else {
            message.reply(
              "No trivia questions found!"
            );
          }
        }
          break;

          case 'answer': {
            if (a.length == 1) {
            const index = parseInt(a[0]);
            const obj = questions[index];
  
            if (obj) {
              const fields = [
                {
                  name: "#",
                  value: index,
                  inline: true,
                },
                {
                  name: "Game",
                  value: obj.game,
                  inline: true,
                },
                {
                  name: "Difficulty",
                  value: obj.difficulty,
                  inline: true,
                },
              ];
              message.channel.send({
                embed: {
                  description: "```Question: " + obj.question + "``````Answer: " + obj.answer + "```",
                  // footer: {
                  //   text: `${obj.game.toUpperCase()} | ${index}`,
                  // },
                  // thumbnail,
                  // author,
                  fields,
                },
              });
            } else {
              message.reply(
                "No trivia answer found!"
              );
            }
          } else {
            message.reply(
              "answer command needs 1 argument, question index number"
            );
          }
          }
            break;

        case 'add':
          if (a.length >= 3) {
            const game = a[0].toLowerCase();
            const difficulty = a[1].toLowerCase();
            const question = a.slice(2).join(" ");

            if (game != "lba1" && game != "lba2") {
              message.reply(`${game} is not a valid game type.`);
              break;
            }

            const obj = {
              type: "question",
              game,
              difficulty,
              question,
              answer: null,
            };

            questions.push(obj);
            const index = questions.length - 1;

            fs.writeFileSync(
              "metadata/questions.json",
              JSON.stringify(questions, null, 2)
            );
            message.reply(`Trivia question ${index} for ${game} added!!`);
            break;
          }

          message.reply(
            "add command needs 3 arguments, game (lba1|lba2), difficulty (easy|medium|hard) and question"
          );
          break;

        case 'add-answer':
          if (a.length >= 2) {
            const index = parseInt(a[0]);
            const answer = a.slice(1).join(" ");
            const obj = questions[index];

            obj.answer = answer;

            fs.writeFileSync(
              "metadata/questions.json",
              JSON.stringify(questions, null, 2)
            );
            message.reply(`Trivia question ${index} for ${obj.game} added!!`);
            break;
          }

          message.reply(
            "add-answer command needs 2 arguments, question index number and the answer text"
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
