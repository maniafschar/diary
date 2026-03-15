import { api } from "./api";
import { ui } from "./ui";

export { dialog };

class dialog {
	static add(event) {
		var popup = document.createElement('div');
		popup.appendChild(document.createElement('style')).textContent = `
tabHeader {
	white-space: nowrap;
	overflow-x: auto;
	max-width: 100%;
	position: relative;
	display: block;
	padding: 0 0.75em;
	z-index: 3;
}

tabBody {
	display: inline-block;
	width: 100%;
	max-width: 50em;
	position: relative;
	overflow-x: hidden;
	height: 100%;
	text-align: left;
}

tabBody>container {
	width: 300%;
	max-height: 70vh;
	transition: all ease-out .4s;
	overflow: hidden;
	position: relative;
	display: flex;
}

tabBody element {
	position: relative;
	width: 33.34%;
	min-height: 10em;
	box-sizing: border-box;
	overflow-y: auto;
	border: solid 1em transparent;
	background: rgba(170, 170, 255, 0.2);
	border-radius: 1em;
}

tabBody img {
	padding: 1em;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 1em;
	margin-top: 0.5em;
	max-width: 98%;
}

tab {
	position: relative;
	display: inline-block;
	cursor: pointer;
	padding: 0.75em 1em;
	border-radius: 1em 1em 0 0;
}

tab.selected {
	background: rgba(170, 170, 255, 0.2);
}`;
		var tabHeader = popup.appendChild(document.createElement('tabHeader'));
		var tab = tabHeader.appendChild(document.createElement('tab'));
		tab.setAttribute('onclick', 'ui.showTab(event)');
		tab.setAttribute('class', 'selected');
		tab.innerText = 'Event';
		tab = tabHeader.appendChild(document.createElement('tab'));
		tab.setAttribute('onclick', 'ui.showTab(event)');
		tab.innerText = 'Location';
		tab = tabHeader.appendChild(document.createElement('tab'));
		tab.setAttribute('onclick', 'ui.showTab(event)');
		tab.innerText = 'User';
		var container = popup.appendChild(document.createElement('tabBody'))
			.appendChild(document.createElement('container'));

		var createField = function (element, label, name, type, value) {
			element.appendChild(document.createElement('label')).innerText = label;
			var field = element.appendChild(document.createElement('field'));
			var input = field.appendChild(document.createElement(type ? type : 'input'));
			input.setAttribute('name', name);
			if (value)
				type == 'textarea' ? input.innerText = value : input.setAttribute('value', value);
			return input;
		};
		var createButton = function (element, action) {
			var div = element.appendChild(document.createElement('div'));
			div.style.textAlign = 'center';
			var button = div.appendChild(document.createElement('button'));
			button.innerText = 'Speichern';
			button.setAttribute('onclick', action);
			return div;
		};

		var element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'event');
		var inputDate = createField(element, 'Datum', 'date', 'input-date', event?.date);
		var date = new Date();
		if (event?.id)
			date.setMonth(date.getMonth() - 1);
		inputDate.setAttribute('minuteStep', 15);
		inputDate.setAttribute('min', date.toISOString());
		document.querySelector('event sortable-table').table().querySelectorAll('td[date]').forEach(td => inputDate.addOccupied(new Date(parseInt(td.getAttribute('date')))));
		createField(element, 'Ort', 'location', 'input-selection', event?.location.id);
		createField(element, 'Bemerkung', 'note', 'textarea', event?.note);
		if (event?.id) {
			var inputId = element.appendChild(document.createElement('input'));
			inputId.setAttribute('type', 'hidden');
			inputId.setAttribute('name', 'id');
			inputId.setAttribute('value', event.id);
		}
		var buttonDiv = createButton(element, 'action.eventPost()');
		if (event?.id && !event.participants) {
			var button = buttonDiv.appendChild(document.createElement('button'));
			button.innerText = 'Löschen';
			button.setAttribute('onclick', 'api.eventDelete(' + event.id + ',()=>{document.dispatchEvent(new CustomEvent("popup"));document.dispatchEvent(new CustomEvent("event"));})');
		}
		document.dispatchEvent(new CustomEvent('location'));

		element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'location');
		createField(element, 'Name', 'name', 'input', event?.location.name);
		createField(element, 'Adresse', 'address', 'textarea', event?.location.address);
		createField(element, 'URL', 'url', 'input', event?.location.url).setAttribute('type', 'url');
		createField(element, 'Telefon', 'phone', 'input', event?.location.phone).setAttribute('type', 'tel');
		createField(element, 'Email', 'email', 'input', event?.location.email).setAttribute('type', 'email');
		if (event?.id) {
			var inputId = element.appendChild(document.createElement('input'));
			inputId.setAttribute('type', 'hidden');
			inputId.setAttribute('name', 'id');
			inputId.setAttribute('value', event.location.id);
		}
		element.appendChild(document.createElement('error'));
		createButton(element, 'action.locationPut()');

		element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'contact');
		createField(element, 'Name', 'name');
		createField(element, 'Email', 'email');
		createButton(element, 'action.contactPatch()');

		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
		document.dispatchEvent(new CustomEvent('location'));
	}

	static verifyEmail(event) {
		var popup = document.createElement('div');
		popup.appendChild(document.createElement('label')).innerText = 'Email';
		var field = popup.appendChild(document.createElement('field'));
		var input = field.appendChild(document.createElement('input'));
		input.setAttribute('type', 'email');
		input = field.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.value = event.target.getAttribute('contact');
		popup.appendChild(document.createElement('error'));
		var div = popup.appendChild(document.createElement('div'));
		div.style.textAlign = 'center';
		var button = div.appendChild(document.createElement('button'));
		button.innerText = 'Benutzer verifizieren';
		button.style.zIndex = 2;
		button.onclick = event => {
			event.preventDefault();
			event.stopPropagation();
			var popup = document.querySelector('dialog-popup').content();
			var contact = JSON.parse(popup.querySelector('input[type="hidden"]').value);
			contact.email = popup.querySelector('input[type="email"]').value;
			if (contact.email.indexOf('@') > 0)
				action.loginVerify(contact);
			else
				document.querySelector('dialog-popup').content().querySelector('error').innerText = 'Gib bitte die Email ein.';
		};
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
	}

	static contact(event) {
		var id = document.querySelector('user sortable-table').list[ui.parents(event.target, 'tr').getAttribute('i')].id;
		api.eventsContact(id, events => {
			var popup = document.createElement('div');
			popup.appendChild(document.createElement('style')).textContent = `
`;
			var now = new Date();
			var table = popup.appendChild(document.createElement('sortable-table'));
			table.list = events.sort((a, b) => new Date(b.date.replace('+00:00', '')) - new Date(a.date.replace('+00:00', '')));
			table.style('tr.past{opacity:0.4;}');
			table.columns.push({ label: 'Datum', width: 25, noaction: true });
			table.columns.push({ label: 'Ort', sort: true, width: 25, noaction: true });
			table.columns.push({ label: 'Bemerkung', sort: true, width: 35, noaction: true });
			table.setConvert(list => {
				var d = [];
				for (var i = 0; i < list.length; i++) {
					var row = [];
					row.push(ui.formatTime(new Date(list[i].date.replace('+00:00', ''))));
					row.push(list[i].location.name);
					row.push(list[i].note);
					if (new Date(list[i].date.replace('+00:00', '')) < now)
						row.row = { class: 'past' };
					d.push(row);
				}
				return d;
			});
			document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
			try {
				table.renderTable();
			} catch (e) {
				// same popup dialog is closed, ignore exception
			}
		});
	}

	static event(event) {
		var id = document.querySelector('event sortable-table').list[ui.parents(event.target, 'tr').getAttribute('i')].id;
		api.event(id, event => {
			var futureEvent = new Date(event.date.replace('+00:00', '')) > new Date();
			var popup = document.createElement('div');
			popup.appendChild(document.createElement('style')).textContent = `
value item {
	display: inline-block;
	position: relative;
	padding: 0.5em;
	margin: 0.25em;
	border-radius: 0.5em;
	cursor: pointer;
	padding-right: 2em;
}

value item.selected {
	background-color: rgba(255, 255, 255, 0.6);
}

value item.selected::after {
	content: '✓';
	position: absolute;
	right: 0.5em;
	top: 0.5em;
}

value.pictures {
	width: 100%;
	min-height: 3.2em;
}

value.pictures div {
	width: 90%;
	max-width: 20em;
	margin: 1%;
	border-radius: 0.5em;
	vertical-align: top;
	display: inline-block;
	position: relative;
}

value.pictures div delete {
	position: absolute;
	left: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.8);
	padding: 0.5em;
	border-radius: 0 0.5em;
	font-size: 0.8em;
}

value.pictures div img {
	border-radius: 0.5em;
	width: 100%;
}

value.participants.history item.selected {
	display: none;
}

value.participants {
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

participant remove {
	position: absolute;
	right: 0;
	width: 2em;
	background-color: rgba(255, 0, 0, 0.4);
	text-align: center;
	margin-left: 0.5em;
	border-radius: 1em;
}

participant input {
	position: absolute;
	right: 3em;
	width: 4em;
	text-align: right;
	height: 1.5em;
	border: none;
}

value a {
	margin-top: 1em;
}`;
			popup.appendChild(document.createElement('label')).innerText = 'Datum';
			popup.appendChild(document.createElement('value')).innerText = ui.formatTime(new Date(event.date.replace('+00:00', '')), true);
			popup.appendChild(document.createElement('label')).innerText = 'Ort';
			if (futureEvent)
				popup.appendChild(document.createElement('value')).innerHTML = event.location.name
					+ (event.location.address ? '<br/><a href="https://maps.google.com/maps/place/' + encodeURIComponent(event.location.address) + '" target="_blank">' + event.location.address + '</a>' : '')
					+ (event.location.phone ? '<br/><a href="tel:' + event.location.phone.replace(/\D/g, '') + '">' + event.location.phone + '</a>' : '')
					+ (event.location.url ? '<br/><a href="' + event.location.url + '" target="_blank">' + event.location.url + '</a>' : '')
					+ (event.location.email ? '<br/><a href="mailto:' + event.location.email + '">' + event.location.email + '</a>' : '');
			else
				popup.appendChild(document.createElement('value')).innerText = event.location.name;
			if (event.note) {
				popup.appendChild(document.createElement('label')).innerText = 'Bemerkung';
				popup.appendChild(document.createElement('value')).innerHTML = event.note.replace(/\n/g, '<br/>');
			}
			popup.appendChild(document.createElement('label')).innerText = 'Teilnehmer';
			var participants = popup.appendChild(document.createElement('value'));
			participants.setAttribute('i', id);
			participants.classList.add('participants');
			if (!futureEvent) {
				participants.classList.add('history');
				participants = participants.appendChild(document.createElement('div'));
				participants.style.opacity = 0.5;
				popup.appendChild(document.createElement('label')).innerText = 'Bilder';
				var pictures = popup.appendChild(document.createElement('value'));
				pictures.classList.add('pictures');
				var buttonImage = pictures.appendChild(document.createElement('input-image'));
				buttonImage.style.right = '0.2em';
				buttonImage.style.top = '0.2em';
				buttonImage.setAttribute('max', 1000);
				var addImage = (id, data) => {
					var image = pictures.appendChild(document.createElement('div')).appendChild(document.createElement('img'));
					image.src = data;
					image.parentElement.setAttribute('i', id);
					image.parentElement.setAttribute('onclick', 'action.eventImageDelete(event,' + id + ')');
					if (data.indexOf('med/') != 0)
						document.dispatchEvent(new CustomEvent('event'));
				}
				buttonImage.setSuccess(e => api.eventImagePost(id, e.type, e.data.substring(e.data.indexOf(',') + 1), eventImageId => addImage(eventImageId, e.data)));
				for (var i = 0; i < event.eventImages?.length; i++)
					addImage(event.eventImages[i].id, 'med/' + event.eventImages[i].image);
			}
			popup.appendChild(document.createElement('label')).innerText = 'Ersteller';
			popup.appendChild(document.createElement('value')).innerText = event.contact.name;
			if (api.contactId == event.contact.id) {
				var button = popup.appendChild(document.createElement('button'));
				button.innerHTML = '<svg width="128" height="128" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.424 4.575a2.5 2.5 0 0 0-3.535 0l-1.06 1.061 3.535 3.536-.354.353-.353.354-3.536-3.536-8.839 8.839a.5.5 0 0 0-.136.255l-.708 3.536a.5.5 0 0 0 .589.588l3.535-.707a.5.5 0 0 0 .256-.137L19.424 8.111a2.5 2.5 0 0 0 0-3.536Z" fill="#000000"></path></svg>';
				button.setAttribute('onclick', 'dialog.add(' + JSON.stringify({ id: event.id, date: event.date, note: event.note, location: event.location, participants: event.contactEvents.length }) + ')');
				button.classList.add('icon');
				button.style.right = 0;
				button.style.top = 0;
			}
			api.contacts(contacts => {
				var pseudonyms = ui.pseudonyms(contacts);
				var p = {}, participantList = [];
				for (var i = 0; i < event.contactEvents.length; i++) {
					p[event.contactEvents[i].contact.id] = event.contactEvents[i];
					participantList.push({
						id: event.contactEvents[i].contact.id,
						name: event.contactEvents[i].contact.name,
						pseudonym: pseudonyms[event.contactEvents[i].contact.id]
					});
				}
				for (var i = 0; i < contacts.length; i++) {
					var item = participants.appendChild(document.createElement('item'));
					item.innerText = contacts[i].pseudonym;
					item.setAttribute('i', contacts[i].id);
					item.setAttribute('onclick', 'action.participate(' + contacts[i].id + ',' + id + ')');
					if (p[contacts[i].id]) {
						item.setAttribute('contactEventId', p[contacts[i].id].id);
						item.setAttribute('class', 'selected');
					}
				}
				document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
				document.dispatchEvent(new CustomEvent('eventParticipation', { detail: { eventId: id, participants: participantList, type: 'read' } }));
			});
		});
	}
}