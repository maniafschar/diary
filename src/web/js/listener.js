import { api } from "./api";
import { dialog } from "./dialog";
import { ui } from "./ui";

export { listener };

class listener {
	static updateCotacts() {
		api.contact.getList(contacts => {
			ui.extractPseudonyms(contacts);
			var table = document.querySelector('user sortable-table');
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

	static updateImageCarousel(index) {
		var autoplay = !index;
		if (!index)
			index = 0;
		var events = document.querySelector('event sortable-table').list;
		var list = [];
		var listImages = function (event) {
			var list = [];
			for (var i = 0; i < event.eventImages.length; i++)
				list.push(event.eventImages[i].image);
			return list;
		};
		var listRatings = function (event) {
			var s = '<input-rating class="event" i="' + event.id + '" value="' + (event.rating / event.ratingCount) + '"></input-rating>';
			for (var i = 0; i < event.eventRatings.length; i++)
				s += '<rating>' + ui.extractPseudonyms()[event.eventRatings[i].contact.id] + ' · ' + (event.eventRatings[i].rating / 20) + '</rating>';
			return s + '<br/>';
		};
		var addEditButton = function () {
			if (api.user.id == events[i].contact.id)
				return '<button class="icon edit" onclick="dialog.add(' + JSON.stringify({ id: events[i].id, date: events[i].date, note: events[i].note }).replace(/"/g, '&quot;') + ')"><img src="/image/edit.svg" /></button>';
			return '';
		}
		for (var i = events.length - 1; i >= 0; i--) {
			if (events[i].eventImages?.length)
				list.push({
					src: listImages(events[i]),
					index: events[i].id,
					text: events[i].note,
					hint: ui.formatTime(new Date(events[i].date.replace('+00:00', ''))) + '<br/>' +
						(events[i].location.name ? events[i].location.name + '<br/>' : '') +
						(events[i].rating ? '<input-rating value="' + (events[i].rating / events[i].ratingCount) + '"></input-rating>' : ''),
					description: ui.formatTime(new Date(events[i].date.replace('+00:00', ''))) + '<br/><br/>' +
						(events[i].location.address ? '<a href="https://maps.google.com/maps/place/' + encodeURIComponent(events[i].location.address.replace(/\n/g, ', ')) + '" target="_blank">' + events[i].location.name + '<br/>' + events[i].location.address.replace(/\n/g, '<br/>') + '</a>' : events[i].location.name) + '<br/><br/>' +
						'<separator></separator>' +
						(events[i].rating ? '<rating>Bewertung des Events</rating><br/>' + listRatings(events[i]) : '') +
						(events[i].note ? '<br/>' + events[i].note.replace(/\n/g, '<br/>') : '') +
						addEditButton() +
						listener.listFeedbacks(events[i]) +
						'<separator></separator>' +
						'<label>Kommentar</label><field><textarea name="feedback"></textarea><button onclick="action.addFeedback(' + events[i].id + ')">Absenden</button></field>' +
						'<label>Bilder hochladen</label><field style="min-height: 3.2em; max-height: initial;"><button onclick="action.addImage(' + JSON.stringify(events[i]).replace(/"/g, '&quot;') + ')" class="addImage icon">+</button><input-image style="display: none;" max="1000"></input-image></field>' +
						'<input-rating type="edit" onclick="action.addRating(' + JSON.stringify(events[i]).replace(/"/g, '&quot;') + ', this.getAttribute(&quot;value&quot;))"></input-rating><br/><br/>'
				});
		}
		document.querySelector('image-carousel').open(list, index, autoplay, `
rating {
	font-size: 0.8em;
	padding: 0.5em 1em 0 1em;
	display: inline-block;
}
separator {
	border-bottom: solid 1px rgba(0, 0, 0, 0.2);
	display: block;
	margin: 1em 0;
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
.addImage{
	right: 0;
	top: 0;
	border-radius: 0 0.5em;
	background: rgba(100, 150, 200, 0.2) !important;
	font-size: 1.3em !important;
}`);
	}

	static updateEvents() {
		api.event.getList(events => {
			document.querySelectorAll('element.login [i="login"]').forEach(e => e.value = '');
			document.querySelector('element.login input-checkbox[name="login"]').setAttribute('checked', 'false');
			document.querySelector('body>button[name="logoff"]').style.display = '';
			var groupname = document.querySelector('body>[name="groupname"]');
			groupname.innerText = api.clients[api.clientId].name;
			groupname.style.display = '';
			if (Object.keys(api.clients).length > 1) {
				groupname.style.cursor = 'pointer';
				groupname.onclick = dialog.client;
			}

			var table = document.querySelector('event sortable-table');
			table.list = events;
			table.style('tr.past td:first-child{opacity:0.5;}input-rating{margin-right:0.5em;}');
			if (!table.columns.length) {
				var now = new Date();
				table.setOpenDetail(event => listener.updateImageCarousel(document.querySelector('event sortable-table').list[ui.parents(event.target, 'tr').getAttribute('i')].id + '.0'));
				table.columns.push({ label: 'Datum/Ort', sort: true, width: 30, detail: true });
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
								images += '<img src="/med/' + list[i].eventImages[i2].image + '" />';
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

			var calendar = document.querySelector('calendar-view');
			calendar.reset();
			calendar.setOpen(event => event.id ? listener.updateImageCarousel(event.id + '.0') : dialog.add(event));
			for (var i = 0; i < events.length; i++)
				calendar.addEvent(events[i].date.substring(0, 10), { id: events[i].id, name: events[i].note || 'Kein Text', rating: events[i].rating });
			calendar.render();
			if (events.length) {
				var pastEvents = document.querySelector('sortable-table')._root.querySelectorAll('tr.past').length;
				document.querySelector('element.event div.title count').innerText = (pastEvents ? pastEvents : '') + (events.length - pastEvents ? (pastEvents ? ' · ' : '') + (events.length - pastEvents) : '');
			} else
				document.querySelector('element.event div.title count').innerText = '';
			document.querySelector('element.event').style.display = 'block';
			document.querySelector('event').previousElementSibling.style.display = 'block';
			document.querySelector('element.login').style.display = 'none';
			document.querySelector('element.calendar').style.display = 'block';
			document.querySelector('element.user').style.display = 'block';
			if (document.querySelector("image-carousel").style.transform?.indexOf('1') > 0)
				setTimeout(listener.updateImageCarousel, 100);
		});
		if (!document.querySelector('user sortable-table').table().querySelector('tbody')?.childElementCount)
			listener.updateCotacts();
		else
			api.activateProgressbar();
	}
	static listFeedbacks(event) {
		var s = '';
		if (event.eventFeedbacks) {
			var addEditButton = function (feedback) {
				if (api.user.id == feedback.contact.id)
					return '<button class="icon edit" onclick="dialog.feedback(' + JSON.stringify({ id: feedback.id, note: event.eventFeedbacks[i].note }).replace(/"/g, '&quot;') + ')"><img src="/image/edit.svg" /></button>';
				return '';
			}
			for (var i = 0; i < event.eventFeedbacks.length; i++)
				s += '<feedback><span>' + ui.extractPseudonyms()[event.eventFeedbacks[i].contact.id] + ' · ' + ui.formatTime(new Date(event.eventFeedbacks[i].createdAt.replace('+00:00', ''))) + '</span>' + event.eventFeedbacks[i].note.replace(/\n/g, '<br/>') + addEditButton(event.eventFeedbacks[i]) + '</feedback>';
		}
		return s;
	}
	static init() {
		document.addEventListener('eventParticipation', event => {
			if (event.detail?.type != 'read')
				listener.updateCotacts();
		});
		document.addEventListener('location', event => {
			var selection = document.querySelector('dialog-popup').content().querySelector('.event input-selection');
			if (selection) {
				if (event.detail?.id)
					selection.setAttribute('value', event.detail.id);
				api.location.getList(locations => {
					selection.clear();
					for (var i = 0; i < locations.length; i++)
						selection.add(locations[i].id, locations[i].name + (locations[i].address ? ' · ' + locations[i].address.replace(/\n/g, ', ') : ''));
				});
			}
			if (event.detail?.type != 'read')
				listener.updateEvents();
		});
		document.addEventListener('contact', listener.updateCotacts);
		document.addEventListener('event', listener.updateEvents);
	}
}
