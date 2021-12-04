var msgLength = 10000;
var userLength = 10000;
var playlistLength = 5000;
var aMessagesDefault = [["Timestamp", "Username", "Message","Team Icon"]];
var aMessages = getOrDefault(CHANNEL.name + "_MSGS", aMessagesDefault.slice(0));
var aUserCountDefault = [["Timestamp", "Usercount"]];
var aUserCount = getOrDefault(CHANNEL.name + "_USERCOUNT", aUserCountDefault.slice(0));
var aPlaylistDefault = [["Timestamp", "Title", "Duration", "Seconds", "Type", "Link"]];
var aPlaylist = getOrDefault(CHANNEL.name + "_PLAYLIST", aPlaylistDefault.slice(0));
var downloadMsg = false;
var downloadUsers = false;
var downloadPlaylist = false;
var teamIconRegex = /Ð(.+?)Ð/;

$('<button id="dl-logs" class="btn btn-sm btn-default">DL Logs</button>')
	.insertAfter($("#emotelistbtn"))
	.on("click", function () {
		downloadMsg = true;
		downloadUsers = true;
		downloadPlaylist = true;
		setTimeout(function () {
			if (downloadMsg) {
				downloadMsg = false;
				var filename = CHANNEL.name + "-CHAT-" + new Date() + ".csv";
				exportToCsv(filename, aMessages);
				aMessages = aMessagesDefault.slice(0);
				setOpt(CHANNEL.name + "_MSGS", aMessages);
			}
		}, 3000);
		setTimeout(function () {
			if (downloadUsers) {
				downloadUsers = false;
				var filename = CHANNEL.name + "-USERS-" + new Date() + ".csv";
				exportToCsv(filename, aUserCount);
				aUserCount = aUserCountDefault.slice(0);
				setOpt(CHANNEL.name + "_USERCOUNT", aUserCount);
			}
		}, 3000);
		setTimeout(function () {
			if (downloadPlaylist) {
				downloadPlaylist = false;
				var filename = CHANNEL.name + "-PLAYLIST-" + new Date() + ".csv";
				exportToCsv(filename, aPlaylist);
				aPlaylist = aPlaylistDefault.slice(0);
				setOpt(CHANNEL.name + "_PLAYLIST", aPlaylist);
			}
		}, 3000);
	});

removeChatSocket();
socket.on("chatMsg", chatSocket);

function removeChatSocket() {
	socket.off("chatMsg", chatSocket);
}

var regex1 = /<a.+href="(.+?)".+<\/a>/gi;
var regex2 = / <span style="display:none" class="teamColorSpan">.+/gi;

function chatSocket(data) {
	if (data.meta.addClass !== "server-whisper") {
		var teamIcon = "None";
		if (teamIconRegex.test(data.msg2)) {
			teamIcon = data.msg2.match(teamIconRegex)[1];
		}
		
		var parsedMsg2 = data.msg2;
		
		if (parsedMsg2.match(regex1) !== null) {
		    parsedMsg2 = parsedMsg2.replace(regex1, "$1")
		}
		if (parsedMsg2.match(regex2) !== null) {
		    parsedMsg2 = parsedMsg2.replace(regex2,"");
		}

		aMessages[aMessages.length] = [data.time, data.username, parsedMsg2, teamIcon];
		if (aMessages.length > msgLength || downloadMsg) {
			downloadMsg = false;
			var filename = CHANNEL.name + "-CHAT-" + new Date() + ".csv";
			exportToCsv(filename, aMessages);
			aMessages = aMessagesDefault.slice(0);
		}
		try {
			setOpt(CHANNEL.name + "_MSGS", aMessages);
		} catch {
			exportToCsv(filename, aMessages);
			aMessages = aMessagesDefault.slice(0);
			setOpt(CHANNEL.name + "_MSGS", aMessages);
		}
	}
}

removeUserSocket();
socket.on("usercount", userSocket);

function removeUserSocket() {
	socket.off("usercount", userSocket);
}

function userSocket(data) {
	aUserCount[aUserCount.length] = [new Date().getTime(), data];
	if (aUserCount.length > userLength || downloadUsers) {
		downloadUsers = false;
		var filename = CHANNEL.name + "-USERS-" + new Date() + ".csv";
		exportToCsv(filename, aUserCount);
		aUserCount = aUserCountDefault.slice(0);
	}
	try {
		setOpt(CHANNEL.name + "_USERCOUNT", aUserCount);
	} catch {
		exportToCsv(filename, aUserCount);
		aUserCount = aUserCountDefault.slice(0);
		setOpt(CHANNEL.name + "_USERCOUNT", aUserCount);
	}
}

removeMediaSocket();
socket.on("changeMedia", mediaSocket);

function removeMediaSocket() {
	socket.off("changeMedia", mediaSocket);
}

function mediaSocket(data) {
	aPlaylist[aPlaylist.length] = [new Date().getTime(), data.title, "`" + data.duration, data.seconds, data.type, data.id];
	if (aPlaylist.length > playlistLength || downloadPlaylist) {
		downloadPlaylist = false;
		var filename = CHANNEL.name + "-PLAYLIST-" + new Date() + ".csv";
		exportToCsv(filename, aPlaylist);
		aPlaylist = aPlaylistDefault.slice(0);
	}
	try {
		setOpt(CHANNEL.name + "_PLAYLIST", aPlaylist);
	} catch {
		exportToCsv(filename, aMessages);
		aMessages = aMessagesDefault.slice(0);
		setOpt(CHANNEL.name + "_PLAYLIST", aPlaylist);
	}
}

function exportToCsv(filename, rows) {
	var processRow = function (row) {
		var finalVal = '';
		for (var j = 0; j < row.length; j++) {
			var innerValue = row[j] === null ? '' : row[j].toString();
			if (row[j] instanceof Date) {
				innerValue = row[j].toLocaleString();
			};
			var result = innerValue.replace(/"/g, '""');
			if (result.search(/("|,|\n)/g) >= 0)
				result = '"' + result + '"';
			if (j > 0)
				finalVal += ',';
			finalVal += result;
		}
		return finalVal + '\n';
	};

	var csvFile = '';
	for (var i = 0; i < rows.length; i++) {
		csvFile += processRow(rows[i]);
	}

	var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		var link = document.createElement("a");
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}

if (hasPermission("mute")) {
	var FLAGGEDUSERS = getOrDefault(CHANNEL.name + "_FLAGGEDUSERS", {});
	var AUTOMUTE = getOrDefault(CHANNEL.name + "_AUTOMUTE", false);

	function autoUnmuteShadowMutedUsers(data) {
		if (Math.floor(data.currentTime) <= 0) {
			setTimeout(function() {
				var flaggedKeys = Object.keys(FLAGGEDUSERS);
				if (flaggedKeys.length > 0) {
					socket.emit("chatMsg", {
						msg: "/unmute " + flaggedKeys[0],
						meta: {}
					});
					delete FLAGGEDUSERS[flaggedKeys[0]];
					autoUnmuteShadowMutedUsers(data);
				} else {
					setOpt(CHANNEL.name + "_FLAGGEDUSERS", FLAGGEDUSERS);
				}
			}, 300);
		}
	}

	function autoShadowMuteUsers(data) {
		if (data.username !== "[server]") {
			$("#userlist").find('span[class$=userlist_owner],span[class$=userlist_siteadmin]').each(function() {
				if ($(this).text() === data.username) {
					data.ismod = true;
					return false;
				}
			});
			if (PLAYER.mediaLength > 1200 && !data.ismod && !data.meta.shadow) { // over 20 minutes
				var cleanedMsg = data.msg.replace(/<(.+?)>/gi,"");
				if (cleanedMsg.length > 50) {
					var splitMsg = cleanedMsg.split(" ");
					var uniqueWords = [splitMsg[0]];

					for (var iUnique = 1; iUnique < splitMsg.length; iUnique++) {
						if (uniqueWords.indexOf(splitMsg[iUnique]) === -1) {
							uniqueWords[uniqueWords.length] = splitMsg[iUnique];
						}
					}

					if (uniqueWords.length/splitMsg.length < .5 || uniqueWords.length <= 5) {
						FLAGGEDUSERS[data.username] = FLAGGEDUSERS[data.username] + 1 || 1; // ++ does not work
						setOpt(CHANNEL.name + "_FLAGGEDUSERS", FLAGGEDUSERS);
					}

					if (FLAGGEDUSERS[data.username] > 3) {
						socket.emit("chatMsg", {
							msg: "/smute " + data.username,
							meta: {}
						});
					}
				}
			}
		}
	}
	
	$('<button id="autoMutebtn" class="btn btn-sm btn-default" title="Toggle auto shadow mute for spammers." style="float:right">Auto Mute ' + (!AUTOMUTE ? 'OFF' : 'ON') + '</button>')
		.appendTo("#chatwrap")
		.on("click", function() {
			AUTOMUTE = !AUTOMUTE;
			setOpt(CHANNEL.name + "_AUTOMUTE", AUTOMUTE);
			if (!AUTOMUTE) {
				this.textContent = "Auto Mute OFF";
				socket.off("chatMsg", autoShadowMuteUsers);
			} else {
				this.textContent = "Auto Mute ON";
				socket.on("chatMsg", autoShadowMuteUsers);
			}
		});

	if (AUTOMUTE) {
		socket.on("chatMsg", autoShadowMuteUsers);
	}
	socket.on("changeMedia", autoUnmuteShadowMutedUsers);
	
	function unmuteAllShadowMuted() {
		setTimeout(function() {
			var mutedList = document.getElementsByClassName("userlist_smuted");
			if (mutedList.length !== 0) {
				socket.emit("chatMsg", {
					msg: "/unmute " + mutedList[0].outerText,
					meta: {}
				});
				unmuteAllShadowMuted();
			}
		}, 300);
	}
	
	$('<button id="unmuteShdwbtn" class="btn btn-sm btn-default" title="Un-shadowmute everyone" style="float:right">Unmute All</button>')
		.appendTo("#chatwrap")
		.on("click", unmuteAllShadowMuted);
}
