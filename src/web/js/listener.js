import { api } from "./api";
import { dialog } from "./dialog";
import { ui } from "./ui";

export { listener };

class listener {
	static updateCotacts() {
		api.contacts(contacts => {
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
		});
	}

	static updateEvents() {
		api.events(events => {
			document.querySelectorAll('login [i="login"]').forEach(e => e.value = '');
			document.querySelector('login input-checkbox[name="login"]').setAttribute('checked', 'false');
			document.querySelector('body>button[name="logoff"]').style.display = '';

			var table = document.querySelector('event sortable-table');
			table.list = events;
			table.style('tr.past{opacity:0.4;}tbody{max-height:18em;}');
			if (!table.columns.length) {
				var now = new Date();
				table.setOpenDetail(dialog.event);
				table.columns.push({ label: 'Datum', width: 30, detail: true });
				table.columns.push({ label: 'Ort', sort: true, width: 30, detail: true });
				table.columns.push({ label: 'Bemerkung', width: 40, detail: true });
				table.setConvert(list => {
					var d = [];
					for (var i = 0; i < list.length; i++) {
						var row = [];
						var date = new Date(list[i].date.replace('+00:00', ''));
						var text = list[i].note ? list[i].note.split('\n')[0] : '';
						if (list[i].rating)
							text = list[i].ratingCount + 'B · ' + parseFloat(list[i].rating / list[i].ratingCount / 20).toFixed(1) + 'S' + (text ? ' · ' + text : '');
						row.push({ attributes: { date: date.getTime() }, text: ui.formatTime(date) });
						row.push(list[i].location.name);
						row.push({ attributes: { i: 'note_' + list[i].id }, text: text });
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

			var history = document.querySelector('history');
			history.textContent = '';
			var margin = 0;
			for (var i = events.length; i > 0; --i) {
				if (events[i].eventImages) {
					document.querySelector('element.history').style.display = '';
					for (var i2 = 0; i2 < events[i].eventImages.length; i2++) {
						var item = history.appendChild(document.createElement('item'));
						item.setAttribute('i', i);
						item.style.marginLeft = margin + '%';
						margin += 100;
						var click = event => {
							var items = document.querySelectorAll('history item');
							var list = [], index = 0;
							var listRatings = function (event) {
								var s = '<input-rating value="' + (event.rating / event.ratingCount) + '"></input-rating><br/>';
								for (var i = 0; i < event.eventRatings.length; i++)
									s += '<rating>' + event.eventRatings[i].contact.name + ' · ' + (event.eventRatings[i].rating / 20) + '</rating>';
								return s + '<br/><br/>';
							};
							for (var i = 0; i < items.length; i++) {
								var e = events[items[i].getAttribute('i')];
								list.push({
									src: items[i].querySelector('img').getAttribute('src'),
									description: ui.formatTime(new Date(e.date.replace('+00:00', ''))) + '<br/>' +
										e.location.name + '<br/><br/>' +
										(e.location.address ? '<a href="https://maps.google.com/maps/place/' + encodeURIComponent(e.location.address.replace(/\n/g, ', ')) + '" target="_blank">' + e.location.address.replace(/\n/g, '<br/>') + '</a><br/><br/>' : '') +
										(e.location.phone ? '<a href="tel:' + e.location.phone.replace(/\D/g, '') + '">' + e.location.phone + '</a><br/>' : '') +
										(e.location.url ? '<a href="' + e.location.url + '" target="_blank">' + e.location.url + '</a><br/>' : '') +
										(e.location.email ? '<a href="mailto:' + e.location.email + '">' + e.location.email + '</a><br/>' : '') +
										(e.location.phone || e.location.url || e.location.email ? '<br/>' : '') +
										(e.location.note ? e.location.note.replace(/\n/g, '<br/>') + '<br/><br/>' : '') +
										(e.location.rating ? '<rating>Bewertung der Location</rating><br/><input-rating value="' + e.location.rating + '"></input-rating><br/><br/>' : '') +
										(e.rating ? '<rating>Bewertung des Events</rating><br/>' + listRatings(e) : '') +
										(e.note ? e.note.replace(/\n/g, '<br/>') : '')
								});
								if (event.target.parentElement == items[i])
									index = i;
							}
							document.querySelector('image-carousel').open(list, index, 'rating{font-size: 0.8em;padding: 0.5em;display: inline-block;}');
						};
						var img = item.appendChild(document.createElement('img'));
						img.setAttribute('src', 'med/' + events[i].eventImages[i2].image);
						img.onclick = click;
						var text = item.appendChild(document.createElement('text'));
						text.appendChild(document.createTextNode(ui.formatTime(new Date(events[i].date.replace('+00:00', '')))));
						text.appendChild(document.createElement('br'));
						text.appendChild(document.createTextNode(events[i].location.name));
						if (events[i].note) {
							text.appendChild(document.createElement('br'));
							var note = events[i].note.replace(/\n/g, ' ');
							while (note.length > 70)
								note = note.substring(0, note.lastIndexOf(' ')).trim();
							if (note.length < events[i].note.length)
								note += ' ...';
							text.appendChild(document.createTextNode(note));
						}
						text.onclick = click;
					}
				}
			}
			document.querySelector('event').style.display = '';
			document.querySelector('event').previousElementSibling.style.display = 'block';
			document.querySelector('login').style.display = 'none';
			document.querySelector('element.user').style.display = '';
		});
		if (!document.querySelector('user sortable-table').table().querySelector('tbody')?.childElementCount)
			listener.updateCotacts();
		else
			api.activateProgressbar();
	}
	static init() {
		document.addEventListener('eventParticipation', e => {
			var td = document.querySelector('event sortable-table').table().querySelector('td[i="note_' + e.detail.eventId + '"]');
			var list = document.querySelector('event sortable-table').list;
			if (td) {
				var note = '';
				if (e.detail.participants.length)
					note += e.detail.participants.length + 'T';
				if (td.innerText?.trim()) {
					var s = td.innerText.replace(/^\d{1,4}T/, '').trim();
					if (s) {
						note += (note ? ' · ' : '') + s;
						while (note.indexOf(' · · ') > -1)
							note = note.replace(' · · ', ' · ');
					}
				}
				td.innerHTML = note || '&nbsp;';
			}
			if (e.detail.type != 'read')
				listener.updateCotacts();
		});
		document.addEventListener('location', () => {
			var selection = document.querySelector('dialog-popup').content().querySelector('.event input-selection');
			if (selection)
				api.locations(locations => {
					selection.clear();
					for (var i = 0; i < locations.length; i++)
						selection.add(locations[i].id, locations[i].name + (locations[i].address ? ' · ' + locations[i].address.replace(/\n/g, ', ') : ''));
				})
			listener.updateEvents();
		});
		document.addEventListener('contact', listener.updateCotacts);
		document.addEventListener('event', listener.updateEvents);
	}
}