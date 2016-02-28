/*
 Module dependencies:

 - Underscore (because it's cool)
 - Socket.IO

 It is a common practice to name the variables after the module name.
 Ex: http is the "http" module, express is the "express" module, etc.
 The only exception is Underscore, where we use, conveniently, an
 underscore. Oh, and "socket.io" is simply called io. Seriously, the
 rest should be named after its module name.

 */

var _ = require("underscore");

var config = {
	port: 4040,
	ipaddr: '0.0.0.0',
	dir: './public',
	history_count: 500,
	history_time: 24*60*60*1000,
//	history_count: 7,
//	history_time: 30*1000,
};
var server = require('./file-server.js')(config);
var io = require("socket.io").listen(server);

var participants = [];

var history = [];

/* Socket.IO events */
io.on("connection", function(socket) {

	socket.emit('history', history);

	/*
	 When a new user connects to our server, we expect an event called "newUser"
	 and then we'll emit an event called "newConnection" with a list of all
	 participants to all connected clients
	 */
	socket.on("newUser", function(data) {
		participants.push({
			id: data.id,
			name: data.name
		});
		io.sockets.emit("newConnection", {
			participants: participants
		});
		console.log(now(), '[new]', '[' + socket.id + ']', '[' + data.name + ']');
	});

	/*
	 When a user changes his name, we are expecting an event called "nameChange"
	 and then we'll emit an event called "nameChanged" to all participants with
	 the id and new name of the user who emitted the original message
	 */
	socket.on("nameChange", function(data) {
		if (_.isUndefined(data.name) || _.isEmpty(data.name.trim())) {
			return;
		}
		var sender = _.findWhere(participants, {
			id: socket.id
		});
		console.log(now(), '[change]', '[' + socket.id + ']', '[' + sender.name + ']' + '->[' + data.name + ']');
		sender.name = data.name;
		// _.findWhere(participants, {
		// 	id: socket.id
		// }).name = data.name;
		io.sockets.emit("nameChanged", {
			id: data.id,
			name: data.name
		});
	});

	/*
	 When a client disconnects from the server, the event "disconnect" is automatically
	 captured by the server. It will then emit an event called "userDisconnected" to
	 all participants with the id of the client that disconnected
	 */
	socket.on("disconnect", function() {
		var sender = _.findWhere(participants, {
			id: socket.id
		});
		if(!sender) return;
		participants = _.without(participants, sender);
		io.sockets.emit("userDisconnected", {
			id: socket.id,
			sender: "system"
		});
		console.log(now(), '[leave]', '[' + socket.id + ']', '[' + sender.name + ']');
	});

	socket.on("msg", function(data) {
		if (_.isUndefined(data) || _.isEmpty(data.trim())) {
			return;
		}
		var sender = _.findWhere(participants, {
			id: socket.id
		});
		if(!sender) return;
		io.sockets.emit("msg", {
			message: data,
			name: sender.name
		});
		history.push([ (new Date())*1.0, sender.name, data]);
		history = cleanup(history, config.history_count, config.history_time);
		console.log(now(), '[say]','[' + sender.name + ']', data);
	});

});

server.listen(config.port, config.ipaddr, function() {
	console.log('\tserver listening on ' + config.ipaddr + ':' + config.port);
});

function now() {
	var pand = function(num) {
		return (num < 10) ? '0' + num : num + '';
	}
	var t = new Date();
	var out = '[';
	out += t.getFullYear();
	out += '/' + pand(t.getMonth() + 1);
	out += '/' + pand(t.getDate());
	out += ' ' + pand(t.getHours());
	out += ':' + pand(t.getMinutes());
	out += ':' + pand(t.getSeconds()) + ']';
	return out;
}

var cleanup = function(arr, max_count, history_time) {
	var i = 0;
	var len = arr.length;

	var out = arr;
	if(len > max_count){
		out = arr.slice(len - max_count);
		len = max_count;
	}
	var n = (new Date())*1.0;
	var idx = 0;
	for(i=0; i<len; i++){
		if(arr[i][0] + history_time < n){
			idx = i;
		}
	}
	if(idx) out = arr.slice(idx);
	return out;
}

var t = setTimeout(function cc(){
	history = cleanup(history, config.history_count, config.history_time);
	t = setTimeout(cc, 10000);
}, 10000);

