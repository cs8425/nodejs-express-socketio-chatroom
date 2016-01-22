function init() {

	var serverBaseUrl = document.domain;

	/*
	 On client init, try to connect to the socket.IO server.
	 Note we don't specify a port since we set up our server
	 to run on port 8080
	 */
	var socket = io.connect(serverBaseUrl);

	//We'll save our session ID in a variable for later
	var sessionId = '';

	//Helper function to update the participants' list
	function updateParticipants(participants) {
		var ele = $('#participants');
		ele.html('');
		var str = '';
		for (var i = 0; i < participants.length; i++) {
			str += '<span id="' + participants[i].id + '">' + htmlesc(participants[i].name) + ' ' + (participants[i].id === sessionId ? '(You)' : '') + '<br /></span>';
		}
		ele.html(str);
	}

	var tmpele = $('#tmp');
	function htmlesc(text) {
		return tmpele.text(text).html();
	}

	function now(time) {
		var pand = function(num) {
			return (num < 10) ? '0' + num : num + '';
		}
		var t = time || new Date();
		t = new Date(t);
		var out = '<';
		out += t.getFullYear();
		out += '/' + pand(t.getMonth() + 1);
		out += '/' + pand(t.getDate());
		out += ' ' + pand(t.getHours());
		out += ':' + pand(t.getMinutes());
		out += ':' + pand(t.getSeconds()) + '>';
		return out;
	}

	function build_msg(data) {
		var message = '<span class="msg">' + htmlesc(data.message) + '</span>';
		var name = '<span class="name">' + htmlesc(data.name) + '</span>';
		var time = '<span class="time">' + now(data.t) + '</span>';
		return '<div>' + '<b>' + name + '</b>' + time + '<br />' + message + '<hr /></div>';
	}

	/*
	 When the client successfully connects to the server, an
	 event "connect" is emitted. Let's get the session ID and
	 log it. Also, let the socket.IO server there's a new user
	 with a session ID and a name. We'll emit the "newUser" event
	 for that.
	 */
	socket.on('connect', function() {
		sessionId = socket.io.engine.id;
		console.log('Connected ' + sessionId);
		socket.emit('newUser', {
			id: sessionId,
			name: $('#name').val()
		});
	});

	/*
	 When the server emits the "newConnection" event, we'll reset
	 the participants section and display the connected clients.
	 Note we are assigning the sessionId as the span ID.
	 */
	socket.on('newConnection', function(data) {
		updateParticipants(data.participants);
	});

	/*
	 When the server emits the "userDisconnected" event, we'll
	 remove the span element from the participants element
	 */
	socket.on('userDisconnected', function(data) {
		$('#' + data.id).remove();
	});

	/*
	 When the server fires the "nameChanged" event, it means we
	 must update the span with the given ID accordingly
	 */
	socket.on('nameChanged', function(data) {
		var ele = $('#' + data.id);
		var name = htmlesc(data.name);
		ele.html(name + ' ' + (data.id === sessionId ? '(You)' : '') + '<br />');
	});

	socket.on('msg', function(data) {
		$('#messages').prepend(build_msg(data));
	});

	socket.on('history', function(data) {
		var html = '';
		var obj = {t: null, name: null, message: null};
		var i = data.length;
		while(i--){
			var msg = data[i];
			obj.t = msg[0];
			obj.name = msg[1];
			obj.message = msg[2];
			html += build_msg(obj);
		}
		$('#messages').prepend(html);
	});

	/*
	 Log an error if unable to connect to server
	 */
	socket.on('error', function(reason) {
		console.log('Unable to connect to server', reason);
	});

	function sendMessage() {
		var outgoingMessage = $('#outgoingMessage').val();
		socket.emit('msg', outgoingMessage);
	}

	function outgoingMessageKeyDown(event) {
		if (event.which == 13) {
			event.preventDefault();
			if ($('#outgoingMessage').val().trim().length <= 0) {
				return;
			}
			sendMessage();
			$('#outgoingMessage').val('');
		}
	}

	function outgoingMessageKeyUp() {
		var outgoingMessageValue = $('#outgoingMessage').val();
		$('#send').attr('disabled', (outgoingMessageValue.trim()).length > 0 ? false : true);
	}

	/*
	 When a user updates his/her name, let the server know by
	 emitting the "nameChange" event
	 */
	function nameFocusOut() {
		var name = $('#name').val();
		if (name == '') {
			$('#name').val('Anonymous');
			return;
		}
		socket.emit('nameChange', {
			id: sessionId,
			name: name
		});
	}

	/* Elements setup */
	$('#outgoingMessage').on('keydown', outgoingMessageKeyDown);
	$('#outgoingMessage').on('keyup', outgoingMessageKeyUp);
	$('#name').on('focusout', nameFocusOut);
	$('#send').on('click', sendMessage);

}

$(document).on('ready', init);
