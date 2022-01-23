import fs from 'fs';
import Diacritics from 'diacritic';

import Discord from 'discord.js';
import { result } from 'lodash';

const requireFunc = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require;
const config = requireFunc('./config.json');

const toUpperFirst = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

const diacriticsAnswer = (str) => {
	let value = str.split('-')[0];
	return Diacritics.clean(value.trim()).replace("'", '').replace(/[^\w\s]/gi, '');
};

process.on('unhandledRejection', (err) => {
	console.error('Uncaught Promise Error: \n' + err.stack);
});

process.on('error', (err) => {
	console.error('Uncaught Error: \n' + err.stack);
});

console.log('Preloading...');

const NUM_MINUTES_RANDOM = 23400000;
const NUM_MINUTES_TO_WAIT = 3600000;
const DIFFICULTY_TYPE = [ 'easy', 'medium', 'hard' ];

let questions = [];
let lastQuestionId = 0;
let lastQuestionTimestamp = null;
let last_question_timer = null;

const client = new Discord.Client();

const questionsFilename = 'metadata/questions.json';
if (fs.existsSync(questionsFilename)) {
	const questionsMetadata = fs.readFileSync(questionsFilename);
	questions = JSON.parse(questionsMetadata);
}

const set_lastquestion = (obj) => {
	lastQuestionId = obj.id;
	lastQuestionTimestamp = Date.now();

	// last_question_timer = setTimeout(() => {
	// 	clear_lastquestion(true);
	// }, NUM_MINUTES_TO_WAIT);
};

const clear_lastquestion = (notify = false) => {
	lastQuestionId = 0;
	lastQuestionTimestamp = null;
	// clearInterval(last_question_timer);
	// if (notify) {
	// 	const channel = client.channels.get(config.channel.trivia);
	// 	const question = 'Time is up!!!';
	// 	channel.send(question);
	// }
};

console.log('Preloading... [OK]');

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	// every 6.5h random message disabled
	// const channel = client.channels.get(config.channel.trivia);
	// setInterval(() => {
	// 	const index = Math.floor(Math.random() * questions.length);
	// 	const obj = questions[index];
	// 	set_lastquestion(obj);
	// 	const question = '```' + obj.question + '```' + `*\`${obj.game.toUpperCase()} | ${obj.id}\`*`;
	// 	channel.send(question);
	// }, NUM_MINUTES_RANDOM);
});

client.on('message', (message) => {
	// ignore other bots or itself
	if (message.author.bot) {
		return;
	}

	if (message.channel.id !== config.channel.trivia) {
		return;
	}

	// check if message starts with our prefix !
	// check if the latest question was send 5 mins ago - if so let the bot interact
	if (
		!message.content.startsWith(config.prefix) &&
		!(lastQuestionTimestamp != null && Date.now() - lastQuestionTimestamp < NUM_MINUTES_TO_WAIT)
	) {
		return;
	}

	const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	const run = (c, a) => {
		try {
			switch (c) {
				case 'ping':
					message.reply('pong');
					break;

				case 'question':
				case 'trivia':
					{
						let id = null;
						let filteredQuestions = [ ...questions ];
						let game = `lba${Math.random() > 0.5 ? 2 : 1}`;
						let difficulty = DIFFICULTY_TYPE[parseInt(Math.random() * 3)];
						if (a.length == 1) {
							if (a[0] == 'lba1' || a[0] == 'lba2') {
								game = a[0];
								filteredQuestions = filteredQuestions.filter((q) => q.game === game);
							} else if (!isNaN(a[0])) {
								id = parseInt(a[0]);
								filteredQuestions = filteredQuestions.filter((q) => q.id === id);
							} else if (a[0] == 'easy' || a[0] == 'medium' || a[0] == 'hard') {
								difficulty = a[0];
								filteredQuestions = filteredQuestions.filter((q) => q.difficulty === difficulty);
							}
						} else if (a.length >= 1) {
							game = a[0];
							filteredQuestions = filteredQuestions.filter((q) => q.game === game);
							if (a.length >= 2) {
								difficulty = a[1];
								filteredQuestions = filteredQuestions.filter((q) => q.difficulty === difficulty);
							}
						}
						let index = parseInt(Math.random() * filteredQuestions.length);
						const obj = filteredQuestions[index];

						if (obj) {
							set_lastquestion(obj);
							message.channel.send({
								embed: {
									description: '```' + obj.question + '```',
									footer: {
										text: `${obj.game.toUpperCase()} | ${obj.id}`
									}
									// thumbnail,
									// author,
									// fields,
								}
							});
						} else {
							message.reply('No trivia questions found!');
						}
					}
					break;

				case 'info':
					{
						if (a.length == 1) {
							const id = parseInt(a[0]);
							const obj = questions.find((q) => q.id === id);

							if (obj) {
								clear_lastquestion();
								const fields = [
									{
										name: 'Game',
										value: `${obj.game} | ${obj.id}`.toUpperCase(),
										inline: true
									},
									{
										name: 'Difficulty',
										value: toUpperFirst(obj.difficulty),
										inline: true
									},
									{
										name: 'By',
										value: obj.author,
										inline: true
									}
								];
								message.channel.send({
									embed: {
										description:
											'```Question: ' + obj.question + '``````Answer: ' + obj.answer + '```',
										// footer: {
										//   text: `${obj.game.toUpperCase()} | ${index}`,
										// },
										// thumbnail,
										// author,
										fields
									}
								});
							} else {
								message.reply('No trivia answer found!');
							}
						} else {
							message.reply('info command needs 1 argument, question index number');
						}
					}
					break;

				case 'answer':
					{
						if (a.length >= 2) {
							const id = parseInt(a[0]);
							const answer = a.slice(1).join(' ').toLowerCase();
							const obj = questions.find((q) => q.id === id);
							if (
								obj != null &&
								obj.answer != null &&
								diacriticsAnswer(obj.answer.toLowerCase()) == diacriticsAnswer(answer)
							) {
								clear_lastquestion();
								message.react('✅');
							} else {
								message.react('❌');
							}
						} else {
							message.reply(
								'answer command needs 2 argument, question index number and the correct answer text'
							);
						}
					}
					break;

				case 'add':
					if (a.length >= 3) {
						const game = a[0].toLowerCase();
						const difficulty = a[1].toLowerCase();
						const question = a.slice(2).join(' ');

						if (game != 'lba1' && game != 'lba2') {
							message.reply(`${game} is not a valid game type.`);
							break;
						}

						const obj = {
							id: questions[questions.length - 1].id + 1,
							type: 'question',
							game,
							difficulty,
							author: message.author.username,
							question,
							answer: null
						};

						questions.push(obj);

						fs.writeFileSync('metadata/questions.json', JSON.stringify(questions, null, 2));
						message.reply(`Trivia question ${obj.id} for ${obj.game} added!!`);
						break;
					}

					message.reply(
						'add command needs 3 arguments, game (lba1|lba2), difficulty (easy|medium|hard) and question'
					);
					break;

				case 'add-answer':
					if (a.length >= 2) {
						const id = parseInt(a[0]);
						const answer = a.slice(1).join(' ');
						const obj = questions.find((q) => q.id === id);

						if (obj != null && obj.author === message.author.username) {
							obj.answer = answer;

							fs.writeFileSync('metadata/questions.json', JSON.stringify(questions, null, 2));
							message.reply(`Trivia answer for question ${id} added!!`);
						} else {
							message.reply(`You don't have permission to add/replace this question ${obj.id}`);
						}
						break;
					}

					message.reply('add-answer command needs 2 arguments, question index number and the answer text');
					break;

				case 'delete':
					if (a.length == 1) {
						const id = parseInt(a[0]);
						const obj = questions.find((q) => q.id === id);

						if (obj != null && obj.author === message.author.username) {
							const index = questions.indexOf((q) => q.id === id);
							if (index > -1) {
								questions.splice(index, 1);
							}
							fs.writeFileSync('metadata/questions.json', JSON.stringify(questions, null, 2));
							message.reply(`Trivia question ${obj.id} removed sucessfully!!`);
						} else {
							message.reply(`You don't have permission to delete trivia question ${obj.id}`);
						}

						break;
					}

					message.reply('delete command needs 1 argument, question index number');
					break;
			}
		} catch (ex) {
			console.log(ex);
		}
	};

	// answer direct message without a command if they are within 5 minutes of the last question
	if (
		!message.content.startsWith(config.prefix) &&
		lastQuestionTimestamp != null &&
		Date.now() - lastQuestionTimestamp < NUM_MINUTES_TO_WAIT
	) {
		run('answer', [ lastQuestionId, message.content ]);
	} else {
		run(command, args);
	}
});

client.on('disconnect', async () => {
	client.destroy();
	client.login(config.token);
});

client.on('error', (err) => console.log(err));

client.login(config.token);
