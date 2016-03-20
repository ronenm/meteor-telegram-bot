TelegramBot = {};
TelegramBot.triggers = {};
TelegramBot.apiBase = "https://api.telegram.org/bot";
TelegramBot.token = false;
TelegramBot.init = false;
TelegramBot.getUpdatesOffset = 0;
TelegramBot.interval = false;

TelegramBot.parseCommandString = function(msg) {
	// splits string into an array
	// and removes the @botname from the command
	// then returns the array
	msg = msg.split(' ');
	msg[0] = msg[0].split('@')[0];
	return msg;
}

TelegramBot.poll = function() {
	const result = TelegramBot.method("getUpdates", {
		offset: TelegramBot.getUpdatesOffset + 1,
	});
	
	// Additional check for duplicate poll data
	// Also skips the call to parsePollResults if there were no results
	if(result && result.result.length > 0 && TelegramBot.getUpdatesOffset !==  _.last(result.result).update_id)
		TelegramBot.parsePollResult(result.result);
}

TelegramBot.start = function() {
	TelegramBot.poll();
	TelegramBot.interval = Meteor.setInterval(() => {
		TelegramBot.poll();
	}, 1000);
}

TelegramBot.stop = function() {
	Meteor.clearInterval(TelegramBot.interval);
}

TelegramBot.parsePollResult = function(data) {
	data.map(item => {
		TelegramBot.getUpdatesOffset = item.update_id;

		const message = item.message;
		const type = Object.keys(message).pop();
		const from = item.message.from.username;
		if(type === 'text' && typeof(TelegramBot.triggers.text) !== 'undefined') {
			const msg = TelegramBot.parseCommandString(item.message.text);
			const obj = _.find(TelegramBot.triggers.text, obj => obj.command == msg[0]);
			if(obj) {
				TelegramBot.send(obj.callback(msg, from, message), message.chat.id);
			}
		} else {
			if(typeof(TelegramBot.triggers[type]) !== 'undefined') {
				TelegramBot.triggers[type].map(trigger => {
					trigger.callback('N/A', from, message);
				});
			}
		}
	});
}

TelegramBot.requestUrl = function(method) {
	const token = TelegramBot.token || process.env.TELEGRAM_TOKEN;
	return TelegramBot.apiBase + token + '/' + method;
}

TelegramBot.addListener = function(command, callback, type = 'text') {
	if(typeof(command) === 'string' && typeof(callback) === 'function') {
		if(typeof(TelegramBot.triggers[type]) === 'undefined') {
			TelegramBot.triggers[type] = [];
		}
		TelegramBot.triggers[type].push({
			command: command,
			callback: callback
		});
		console.log('Added command ' + command);
	}
	else {
		console.log("Error adding command " + command);
	}
}

TelegramBot.method = function(method, object = {}) {
	try {
		const res = HTTP.get(TelegramBot.requestUrl(method), {
			params: object
		});
		if(res.data) {
			return res.data;
		}
	}
	catch (e) {
		console.log("Error in polling:");
		console.log(e);
		return false;
	}
}

TelegramBot.send = function(msg, chatId) {
	if(!msg) {
		return false;
	}

	if(markdown)
		TelegramBot.method('sendMessage', {
			chat_id: chatId,
			text: msg,
			parse_mode: 'Markdown'
		});
	else
		TelegramBot.method('sendMessage', {
			chat_id: chatId,
			text: msg
		});
}
