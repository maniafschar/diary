import { api } from "./api";
import { dialog } from "./dialog";
import { ui } from "./ui";

export { listener };

class listener {
	static updateContacts() {
		api.contact.getList(contacts => {
			ui.extractPseudonyms(contacts);
			var table = document.querySelector('user view-table');
			table.list = contacts;
			if (!table.columns.length) {
				table.setOpenDetail(dialog.contact);
				table.columns.push({ label: 'Name', sort: true, width: 30, detail: true });
				table.columns.push({ label: 'Bemerkung', sort: true, width: 60, detail: true });
				table.columns.push({ label: 'Verifiziert', sort: true, width: 10, style: 'text-align: center;', detail: true });
				table.setConvert(list => {
					var d = [];
					for (var i = 0; i < list.length; i++) {
						var row = [];
						row.push(list[i].name);
						row.push({ text: list[i].participations ? list[i].participations : '', attributes: { value: list[i].participations } });
						row.push(list[i].verified ? '✓' : {
							text: '+',
							attributes: {
								onopen: 'dialog.verifyEmail',
								contact: JSON.stringify({
									id: list[i].id,
									name: list[i].name
								})
							}
						});
						d.push(row);
					}
					return d;
				});
			}
			table.renderTable();
			api.activateProgressbar();
			document.querySelector('element.user div.title count').innerText = contacts.length;
		});
	}

	static updateViewImage(index) {
		var events = document.querySelector('event view-table').list;
		var list = [];
		var listImages = function (event) {
			var list = [];
			for (var i = 0; i < event.eventImages.length; i++)
				list.push(event.eventImages[i].image);
			return list;
		};
		var listImageThumbnails = function (event) {
			var list = '';
			for (var i = 0; i < event.eventImages.length; i++)
				list += '<thumbnail onclick="action.eventImageDelete(event,' + event.eventImages[i].id + ')" i="' + event.eventImages[i].id + '"><img src="/med/' + event.eventImages[i].imageThumbnail + '" /></thumbnail>';
			return list;
		};
		var listRatings = function (event) {
			var s = '<input-rating class="event" i="' + event.id + '" value="' + (event.rating / event.ratingCount) + '"></input-rating><br/>';
			var pseudonyms = ui.extractPseudonyms();
			if (api.user?.id)
				for (var i = 0; i < event.eventRatings.length; i++)
					s += '<rating>' + pseudonyms[event.eventRatings[i].contact.id] + ' · ' + (event.eventRatings[i].rating / 20) + '</rating>';
			return s + '<br/><br/>';
		};
		var addEdit = function () {
			return api.user.id == events[i].contact.id ?
				' onclick="dialog.event(' + JSON.stringify({ id: events[i].id, date: events[i].date, note: events[i].note, location: { id: events[i].location.id } }).replace(/"/g, '&quot;') + ')"' : '';
		};
		var listFeedbacks = function (event) {
			var s = '';
			if (event.eventFeedbacks) {
				var addEdit = function (feedback) {
					return api.user.id == feedback.contact.id ?
						' onclick="dialog.feedback(' + JSON.stringify({ id: feedback.id, note: event.eventFeedbacks[i].note }).replace(/"/g, '&quot;') + ')"' : '';
				}
				for (var i = 0; i < event.eventFeedbacks.length; i++)
					s += '<feedback' + addEdit(event.eventFeedbacks[i]) + '><span>' + ui.extractPseudonyms()[event.eventFeedbacks[i].contact.id] + ' · ' + ui.formatTime(new Date(event.eventFeedbacks[i].createdAt.replace('+00:00', ''))) + '</span>' + event.eventFeedbacks[i].note.replace(/\n/g, '<br/>') + '</feedback>';
			}
			return s;
		};
		var contacts = document.querySelector('user view-table').list;
		var pseudonyms = ui.extractPseudonyms(contacts);
		var listParticipants = function (event) {
			var p = {}, participantList = [], s = '<participants>';
			for (var i = 0; i < event.contactEvents.length; i++) {
				p[event.contactEvents[i].contact.id] = event.contactEvents[i];
				participantList.push({
					id: event.contactEvents[i].contact.id,
					name: event.contactEvents[i].contact.name,
					pseudonym: pseudonyms[event.contactEvents[i].contact.id]
				});
			}
			for (var i = 0; i < contacts.length; i++) {
				s += '<item onclick="action.participate(' + contacts[i].id + ',' + event.id + ')"' +
					' i="' + contacts[i].id + '"' +
					(p[contacts[i].id] ? ' contactEventId="' + p[contacts[i].id].id + '" class="selected"' : '') +
					'>' + contacts[i].pseudonym + '</item>';
			}
			return s + '</participants>';
		};
		for (var i = events.length - 1; i >= 0; i--) {
			list.push({
				src: listImages(events[i]),
				index: events[i].id,
				text: events[i].note,
				hint: ui.formatTime(new Date(events[i].date.replace('+00:00', ''))) + '<br/>' +
					(events[i].location.name ? events[i].location.name + '<br/>' : '') +
					(events[i].rating ? '<input-rating value="' + (events[i].rating / events[i].ratingCount) + '"></input-rating>' : ''),
				description: '<date' + addEdit() + '>' + ui.formatTime(new Date(events[i].date.replace('+00:00', ''))) + '</date>' +
					(events[i].location.address ? '<a href="https://maps.google.com/maps/place/' + encodeURIComponent(events[i].location.address.replace(/\n/g, ', ')) + '" target="_blank">' + events[i].location.name + '<br/>' + events[i].location.address.replace(/\n/g, '<br/>') + '</a>' : events[i].location.name) + '<br/><br/>' +
					'<separator></separator>' +
					(events[i].note ? '<img class="speak" onclick="this.getRootNode().host.toggleSpeak()" src="image/speaker.svg" />' : '') +
					(events[i].rating ? listRatings(events[i]) : '') +
					(events[i].note ? '<note' + addEdit() + '>' + events[i].note.replace(/\n/g, '<br/>') + '</note>' : '') +
					listFeedbacks(events[i]) +
					(api.user?.id ?
						'<separator></separator>' +
						'<label>Kommentar</label><field><textarea name="feedback"></textarea><button onclick="action.addFeedback(' + events[i].id + ')">Absenden</button></field>' +
						'<label>Bilder</label><field style="min-height: 3.2em; max-height: initial; text-align: left;">' + listImageThumbnails(events[i]) + '<button onclick="action.addImage(' + JSON.stringify(events[i]).replace(/"/g, '&quot;') + ')" class="addImage icon">+</button><input-image style="display: none;" max="1000"></input-image></field>' +
						'<label>Teinahmer</label><field style="min-height: 3.2em; max-height: initial;">' + listParticipants(events[i]) + '</field>' +
						'<input-rating type="edit" onclick="action.addRating(' + JSON.stringify(events[i]).replace(/"/g, '&quot;') + ', this.getAttribute(&quot;value&quot;))"></input-rating>'
						: ''
					) + '<br/><br/>'
			});
		}
		document.querySelector('view-image').open(list, index,
			`rating {
	font-size: 0.8em;
	padding: 0.5em 1em 0 1em;
	display: inline-block;
}
separator {
	border-bottom: solid 1px rgba(0, 0, 0, 0.2);
	display: block;
	margin: 1em 0;
}
date,
note {
	position: relative;
	display: block;
	margin-bottom: 1em;
	cursor: pointer;
}
feedback {
	display: block;
	position: relative;
	padding-top: 1em;
	border-top: solid 1px rgba(0, 0, 0, 0.1);
	margin-top: 1em;
}
feedback>span {
	display: block;
	position: relative;
	font-size: 0.8em;
}
input-rating {
	padding-top: 0.5em;
}
thumbnail {
	display: inline-block;
	position: relative;
	text-align: left;
	cursor: pointer;
}
thumbnail img {
	margin: 0.25em;
	border-radius: 0.5em;
}
thumbnail delete {
	position: absolute;
	left: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.8);
	padding: 0.5em;
	border-radius: 0 0.5em;
	font-size: 0.8em;
}
.addImage{
	right: 0;
	top: 0;
	border-radius: 0 0.5em;
	background: rgba(100, 150, 200, 0.2) !important;
	font-size: 1.3em !important;
}
field item {
	display: inline-block;
	position: relative;
	padding: 0.5em;
	margin: 0.25em;
	border-radius: 0.5em;
	cursor: pointer;
	padding-right: 2em;
	background-color: rgba(255, 255, 255, 0.4);
}
field item.selected {
	background-color: rgba(255, 255, 255, 0.8);
}
field item.selected::after {
	content: '✓';
	position: absolute;
	right: 0.5em;
	top: 0.5em;
}
field.participants.history item.selected {
	display: none;
}
field.participants {
	max-height: initial;
	text-align: center;
	width: 100%;
	min-width: 15em;
}
participant {
	position: relative;
	display: block;
	margin: 0.5em;
	text-align: left;
}
img.speak {
	right: 0;
	cursor: pointer;
	position: absolute;
	right: 0;
	width: 2em;
	height: 2em;
	padding: 0 1em 2em 2em;
}`);
	}

	static updateEvents(event) {
		var access = !api.user?.id && event.detail?.access;
		api.event.getList(access, events => {
			document.querySelectorAll('element.login [i="login"]').forEach(e => e.value = '');
			document.querySelector('element.login input-checkbox[name="login"]').setAttribute('checked', 'false');
			if (access && !events.length)
				return;
			var clientName = document.querySelector('body>[name="clientName"]');
			clientName.style.display = '';
			if (api.clientId) {
				clientName.innerText = api.clients[api.clientId].name;
				if (Object.keys(api.clients).length > 1) {
					clientName.style.cursor = 'pointer';
					clientName.onclick = dialog.client;
				}
			}

			var table = document.querySelector('event view-table');
			table.list = events;
			table.style('tr.past td:first-child{opacity:0.5;}input-rating{margin-right:0.5em;}');
			if (!table.columns.length) {
				var now = new Date();
				table.setOpenDetail(event => listener.updateViewImage(document.querySelector('event view-table').list[ui.parents(event.target, 'tr').getAttribute('i')].id + '.0'));
				table.columns.push({ label: 'Datum/Ort', sort: true, width: 30, detail: true, style: 'overflow-y:hidden;' });
				table.columns.push({ label: 'Bilder', width: 15, detail: true });
				table.columns.push({ label: 'Bemerkung', sort: true, width: 55, detail: true });
				table.setConvert(list => {
					var d = [];
					for (var i = 0; i < list.length; i++) {
						var row = [];
						var date = new Date(list[i].date.replace('+00:00', ''));
						var text = list[i].note ? list[i].note.split('\n')[0] : '', textSort = text;
						var images = '';
						if (list[i].eventImages) {
							for (var i2 = 0; i2 < list[i].eventImages.length; i2++)
								images += '<img src="/med/' + list[i].eventImages[i2].imageThumbnail + '" />';
						}
						if (list[i].rating) {
							text = '<input-rating class="minimal" value="' + parseFloat(list[i].rating / list[i].ratingCount).toFixed(1) + '"></input-rating>' + (text || '');
							textSort = list[i].rating + textSort;
							if (textSort.length > 10)
								textSort = textSort.substring(0, 10).trim();
						}
						row.push({ attributes: { value: date.getTime() }, text: ui.formatTime(date) + '<br/>' + list[i].location.name });
						row.push({ attributes: { class: 'image' }, text: images });
						row.push({ attributes: { class: 'text', i: 'note_' + list[i].id, value: textSort }, text: text });
						if (date < now)
							row.row = { class: 'past' };
						d.push(row);
					}
					return d;
				});
			}
			table.renderTable();
			var trs = table.table().querySelectorAll('tbody tr');
			for (var i = 0; i < trs.length; i++)
				document.dispatchEvent(new CustomEvent('eventParticipation', { detail: { eventId: events[i].id, participants: events[i].contactEvents, type: 'read' } }));

			var viewCalendar = document.querySelector('view-calendar');
			viewCalendar.reset();
			viewCalendar.setOpenDetail(event => event.id ? listener.updateViewImage(event.id + '.0') : api.user?.id ? dialog.add(event) : null);
			var map = [];
			var formatAddress = address => {
				if (address && address.split('\n').length > 2)
					address = address.substring(0, address.lastIndexOf('\n'));
				return address;
			};
			for (var i = events.length - 1; i >= 0; i--) {
				viewCalendar.addEvent(events[i].date.substring(0, 10), { id: events[i].id, name: events[i].note || 'Kein Text', rating: events[i].rating });
				if (events[i].location.latitude)
					map.push({
						id: events[i].id,
						date: ui.formatTime(new Date(events[i].date.replace('+00:00', ''))),
						name: events[i].location.name,
						address: formatAddress(events[i].location.address),
						latitude: events[i].location.latitude,
						longitude: events[i].location.longitude,
						altitude: events[i].location.altitude,
						note: events[i].note,
						rating: events[i].rating ? events[i].rating / events[i].ratingCount : null,
						images: events[i].eventImages.length ? events[i].eventImages.map(e => '/med/' + e.imageThumbnail) : null
					});
			}
			viewCalendar.render();
			var viewMap = document.querySelector('view-map');
			viewMap.setLocations(map);
			viewMap.setOpenDetail(event => event.id && listener.updateViewImage(event.id + '.0'));
			if (events.length) {
				var pastEvents = document.querySelector('view-table')._root.querySelectorAll('tr.past').length;
				document.querySelector('element.event div.title count').innerText = (pastEvents ? pastEvents : '') + (events.length - pastEvents ? (pastEvents ? ' · ' : '') + (events.length - pastEvents) : '');
			} else
				document.querySelector('element.event div.title count').innerText = '';
			document.querySelector('element.event').style.display = 'block';
			document.querySelector('element.login').style.display = 'none';
			document.querySelector('body>button[name="logoff"]').style.display = '';
			if (access) {
				document.querySelector("element.event button.add").style.display = 'none';
				document.querySelector("element.event button.export").style.display = 'none';
				api.authentication.getClient(access, client => clientName.innerText = client.name);
			} else {
				document.querySelector('element.user').style.display = 'block';
				if (document.querySelector("view-image").style.transform?.indexOf('1') > 0)
					setTimeout(() => listener.updateViewImage(document.querySelector("view-image").index), 100);
			}
		});
		if (!access && !document.querySelector('user view-table').table().querySelector('tbody')?.childElementCount)
			listener.updateContacts();
		else
			api.activateProgressbar();
	}

	static init() {
		document.addEventListener('eventParticipation', event => {
			if (event.detail?.type != 'read')
				listener.updateContacts();
		});
		document.addEventListener('location', event => {
			var selection = document.querySelector('dialog-popup').content().querySelector('input-selection');
			if (selection) {
				api.location.getList(locations => {
					selection.clear();
					if (event.detail?.id)
						selection.setAttribute('value', event.detail.id);
					locations.sort((a, b) => (a.name + a.address).toLowerCase().localeCompare((b.name + b.address).toLowerCase()));
					for (var i = 0; i < locations.length; i++)
						selection.add(locations[i].id, locations[i].name + (locations[i].address ? ' · ' + locations[i].address.replace(/\n/g, ', ') : ''));
				});
			}
		});
		document.addEventListener('contact', listener.updateContacts);
		document.addEventListener('event', listener.updateEvents);
		document.querySelector('elementContainer>element.map').addEventListener('visible', () => document.querySelector('view-map').init());
	}
}
