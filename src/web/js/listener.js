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
						row.push({ attributes: { date: date.getTime() }, text: ui.formatTime(date) });
						row.push(list[i].location.name);
						row.push({ attributes: { i: 'note_' + list[i].id }, text: list[i].note ? list[i].note.split('\n')[0] : '' });
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
			for (var i = 0; i < events.length; i++) {
				if (events[i].eventImages) {
					document.querySelector('element.history').style.display = '';
					for (var i2 = 0; i2 < events[i].eventImages.length; i2++) {
						var item = history.appendChild(document.createElement('item'));
						item.style.marginLeft = margin + '%';
						margin += 100;
						var click = event => {
							var items = document.querySelectorAll('history item');
							var list = [], index = 0;
							for (var i = 0; i < items.length; i++) {
								list.push({
									src: items[i].querySelector('img').getAttribute('src'),
									text: items[i].querySelector('text').innerHTML
								});
								if (event.target.parentElement == items[i])
									index = i;
							}
							document.querySelector('image-carousel').open(list, index);
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
							text.appendChild(document.createTextNode(events[i].note));
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
					note += e.detail.participants.length + ' Teilnehmer';
				if (td.innerText?.trim()) {
					var s = td.innerText.replace(/^\d{1,4} Teilnehmer/, '').trim();
					if (s.indexOf(',') == 0)
						s = s.substring(1).trim();
					if (s)
						note += (note ? ', ' : '') + s;
				}
				td.innerHTML = note || '&nbsp;';
				list[ui.parents(td, 'tr').getAttribute('i')].note = note;
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