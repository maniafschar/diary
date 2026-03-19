import { api } from "./api";
import { ui } from "./ui";

export { dialog };

class dialog {
	static longitude;
	static latitude;
	static nearbySearch;

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
}

button.location {
	background-image: url(image/location.svg);
	background-size: 1.4em;
	top: 0.4em;
	right: 0.4em;
	border-radius: 0 0.4em;
	background-repeat: no-repeat;
	background-position-x: 0.3em;
	background-position-y: 0.3em;
	background-color: rgba(100, 150, 200, 0.2);
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

		var element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'event');
		var inputDate = dialog.createField(element, 'Datum', 'date', 'input-date', event?.year ? event.year + '-' + event.month + '-' + event.day + ' ' + new Date().getHours() + ':00' : event?.date);
		var date = new Date();
		date.setMonth(date.getMonth() - 2);
		inputDate.setAttribute('minuteStep', 15);
		inputDate.setAttribute('min', date.toISOString());
		document.querySelector('event sortable-table').table().querySelectorAll('td[date]').forEach(td => inputDate.addOccupied(new Date(parseInt(td.getAttribute('date')))));
		dialog.createField(element, 'Ort', 'location', 'input-selection', event?.location?.id);
		dialog.createField(element, 'Bemerkung', 'note', 'textarea', event?.note).style.height = '14em';
		if (event?.id) {
			var inputId = element.appendChild(document.createElement('input'));
			inputId.setAttribute('type', 'hidden');
			inputId.setAttribute('name', 'id');
			inputId.setAttribute('value', event.id);
		}
		var buttonDiv = dialog.createButton(element, 'action.eventPost()');
		if (event?.id && !event.participants) {
			var button = buttonDiv.appendChild(document.createElement('button'));
			button.innerText = 'Löschen';
			button.setAttribute('onclick', 'api.eventDelete(' + event.id + ',()=>{document.dispatchEvent(new CustomEvent("popup"));document.dispatchEvent(new CustomEvent("event"));})');
		}
		document.dispatchEvent(new CustomEvent('location'));

		element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'location');
		dialog.createField(element, 'Name', 'name', null, event?.location?.name);
		var address = dialog.createField(element, 'Adresse', 'address', 'textarea', event?.location?.address);
		var input = address.parentElement.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', 'longitude');
		input = address.parentElement.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', 'latitude');
		var locationButton = address.parentElement.appendChild(document.createElement('button'));
		locationButton.src = 'image/location.svg';
		locationButton.classList.add('icon');
		locationButton.classList.add('location');
		locationButton.onclick = () => {
			var call = () => api.nearby(dialog.latitude, dialog.longitude, address => {
				var popup = document.querySelector('dialog-popup').content();
				popup.querySelector('element.location textarea[name="address"]').value = address.address;
				popup.querySelector('element.location input[name="longitude"]').value = address.longitude;
				popup.querySelector('element.location input[name="latitude"]').value = address.latitude;
				popup.querySelector('button.location').remove();
			});
			if (dialog.latitude)
				call();
			else
				navigator.geolocation.getCurrentPosition(result => {
					if (result.coords && result.coords.latitude) {
						dialog.latitude = result.coords.latitude;
						dialog.longitude = result.coords.longitude;
						call();
					}
				}, null, { timeout: 10000, maximumAge: 10000, enableHighAccuracy: true });
		};
		dialog.createField(element, 'URL', 'url', null, event?.location?.url).setAttribute('type', 'url');
		dialog.createField(element, 'Telefon', 'phone', null, event?.location?.phone).setAttribute('type', 'tel');
		dialog.createField(element, 'Email', 'email', null, event?.location?.email).setAttribute('type', 'email');
		dialog.createField(element, 'Bemerkung', 'note', 'textarea', event?.location?.note);
		dialog.createField(element, 'Bewertung', 'rating', 'input-rating', event?.location?.rating).setAttribute('type', 'edit');
		if (event?.id) {
			var inputId = element.appendChild(document.createElement('input'));
			inputId.setAttribute('type', 'hidden');
			inputId.setAttribute('name', 'id');
			inputId.setAttribute('value', event.location.id);
		}
		element.appendChild(document.createElement('error'));
		dialog.createButton(element, 'action.locationPut()');

		element = container.appendChild(document.createElement('element'));
		element.setAttribute('class', 'contact');
		dialog.createField(element, 'Name', 'name');
		dialog.createField(element, 'Email', 'email');
		dialog.createButton(element, 'action.contactPatch()');

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
		var contact = document.querySelector('user sortable-table').list[ui.parents(event.target, 'tr').getAttribute('i')];
		var popup = document.createElement('div');
		popup.appendChild(document.createElement('style')).textContent = `
img {
	max-width: 30em;
}

hint {
	color: red;
	padding: 0.5em 3em 0.5em 0.5em;
	display: block;
	position: relative;
}

value.pictures {
	width: 100%;
	min-height: 3.2em;
	max-height: initial;
}`;
		if (api.user.admin || contact.id == api.user.id) {
			popup.style.minWidth = '20em';
			dialog.createField(popup, 'Name', 'name', null, contact.name);
			dialog.createField(popup, 'Email', 'email');
			dialog.createField(popup, null, 'notification', 'input-checkbox', contact.notification).setAttribute('label', 'Benachrichtigung');
			if (api.user.admin && contact.id == api.user.id) {
				dialog.createField(popup, 'Blogname', 'clientName', null, api.user.client.name);
				dialog.createField(popup, 'Beschreibung', 'clientNote', 'textarea', api.user.client.note);
				popup.appendChild(document.createElement('label')).innerText = 'Bild';
				var pictures = popup.appendChild(document.createElement('value'));
				pictures.classList.add('pictures');
				pictures.appendChild(document.createElement('hint'));
				var clientImage = pictures.appendChild(document.createElement('img'));
				clientImage.style.display = 'none';
				clientImage.setAttribute('name', 'clientImage');
				var buttonImage = pictures.appendChild(document.createElement('input-image'));
				buttonImage.style.right = 0;
				buttonImage.style.top = 0;
				buttonImage.style.borderRadius = '0 0.5em';
				buttonImage.setAttribute('max', 2500);
				buttonImage.setSuccess(file => {
					if (file.scaled.width > 800 && file.scaled.height > 800) {
						pictures.querySelector('hint').innerText = '';
						var image = pictures.querySelector('img');
						image.src = file.data;
						image.style.display = '';
						image.parentElement.setAttribute('onclick', 'action.clientImageDelete(event)');
					} else {
						pictures.querySelector('hint').innerText = 'Bild Größe ' + file.scaled.width + ' x ' + file.scaled.height + ' ist zu klein, Mindestgröße 800 x 800.';
						pictures.querySelector('img').style.display = 'none';
					}
				});
			}
			dialog.createButton(popup, 'action.contactPatch()');
		} else
			popup.appendChild(document.createTextNode(contact.name));
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
	}

	static event(id) {
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
	max-height: initial;
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
			if (!futureEvent && (event.contact.id == api.user.id || event.ratingCount > 0)) {
				popup.appendChild(document.createElement('label')).innerText = 'Bewertung';
				var value = popup.appendChild(document.createElement('value'));
				value.style.textAlign = 'center';
				if (event.contact.id == api.user.id) {
					var rating = value.appendChild(document.createElement('input-rating'));
					rating.setAttribute('value', 0);
					rating.setAttribute('type', 'edit');
					rating.setOnchange(rating => api.eventRatingPut(id, rating, () => document.dispatchEvent(new CustomEvent('event'))));
				}
				if (event.ratingCount > 0) {
					value.appendChild(document.createElement('br'));
					rating = value.appendChild(document.createElement('input-rating'));
					rating.setAttribute('value', event.rating / event.ratingCount);
				}
			}
			popup.appendChild(document.createElement('label')).innerText = 'Teilnehmer';
			var participants = popup.appendChild(document.createElement('value'));
			participants.setAttribute('i', id);
			participants.classList.add('participants');
			if (!futureEvent) {
				popup.appendChild(document.createElement('label')).innerText = 'Bilder';
				var pictures = popup.appendChild(document.createElement('value'));
				pictures.classList.add('pictures');
				if (event.contact.id == api.user.id) {
					var buttonImage = pictures.appendChild(document.createElement('input-image'));
					buttonImage.style.right = 0;
					buttonImage.style.top = 0;
					buttonImage.style.borderRadius = '0 0.5em';
					buttonImage.setAttribute('max', 1000);
					var addImage = (id, data) => {
						var image = pictures.appendChild(document.createElement('div')).appendChild(document.createElement('img'));
						image.src = data;
						image.parentElement.setAttribute('i', id);
						image.parentElement.setAttribute('onclick', 'action.eventImageDelete(event,' + id + ')');
						if (data.indexOf('med/') != 0)
							document.dispatchEvent(new CustomEvent('event'));
					};
					buttonImage.setSuccess(e => api.eventImagePost(id, e.type, e.data.substring(e.data.indexOf(',') + 1), eventImageId => addImage(eventImageId, e.data)));
				}
				for (var i = 0; i < event.eventImages?.length; i++)
					addImage(event.eventImages[i].id, 'med/' + event.eventImages[i].image);
			}
			if (api.user.id == event.contact.id) {
				var button = popup.appendChild(document.createElement('button'));
				button.innerHTML = '<svg width="128" height="128" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.424 4.575a2.5 2.5 0 0 0-3.535 0l-1.06 1.061 3.535 3.536-.354.353-.353.354-3.536-3.536-8.839 8.839a.5.5 0 0 0-.136.255l-.708 3.536a.5.5 0 0 0 .589.588l3.535-.707a.5.5 0 0 0 .256-.137L19.424 8.111a2.5 2.5 0 0 0 0-3.536Z" fill="#000000"></path></svg>';
				button.setAttribute('onclick', 'dialog.add(' + JSON.stringify({ id: event.id, date: event.date, note: event.note, location: event.location, participants: event.contactEvents.length }) + ')');
				button.classList.add('icon');
				button.style.right = 0;
				button.style.top = 0;
			}
			api.contacts(contacts => {
				var pseudonyms = ui.extractPseudonyms(contacts);
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

	static createField(element, label, name, type, value) {
		if (label)
			element.appendChild(document.createElement('label')).innerText = label;
		var field = element.appendChild(document.createElement('field'));
		var input = field.appendChild(document.createElement(type ? type : 'input'));
		input.setAttribute('name', name);
		if (value) {
			if (type == 'textarea')
				input.innerHTML = value.replace(/\n/g, '&#10;');
			else if (type == 'input-checkbox')
				input.setAttribute('checked', value);
			else
				input.setAttribute('value', value);
		}
		return input;
	}

	static createButton(element, action) {
		var div = element.appendChild(document.createElement('div'));
		div.style.textAlign = 'center';
		div.style.clear = 'left';
		var button = div.appendChild(document.createElement('button'));
		button.innerText = 'Speichern';
		button.setAttribute('onclick', action);
		return div;
	}
}