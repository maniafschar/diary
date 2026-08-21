import { action } from "./action";
import { api } from "./api";
import { InputDate } from "./element/InputDate";
import { ui } from "./ui";

export { dialog };

class dialog {
	static files;
	static stylePictures = `
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

value.pictures div img,
value.pictures div video {
	border-radius: 0.5em;
	width: 100%;
	padding: 0;
}`;

	static add(event) {
		dialog.files = [];
		var popup = document.createElement('div');
		popup.appendChild(document.createElement('style')).textContent = `
element {
	width: 40em;
	max-width: 100%;
	display: block;
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
}

${dialog.stylePictures}`;
		var element = popup.appendChild(document.createElement('element'));
		element.appendChild(document.createElement('label')).innerText = 'Bild';
		var pictures = element.appendChild(document.createElement('value'));
		pictures.classList.add('pictures');
		var buttonImage = pictures.appendChild(document.createElement('input-image'));
		buttonImage.style.right = 0;
		buttonImage.style.top = 0;
		buttonImage.style.borderRadius = '0 0.5em';
		buttonImage.setAttribute('max', 1000);
		buttonImage.setSuccess(e => {
			var div = pictures.appendChild(document.createElement('div'));
			var content = document.querySelector('dialog-popup').content();
			var image;
			if (e.datetime)
				content.querySelector('input-date[name="date"]').setAttribute('value', InputDate.local2server(e.datetime));
			if (e.location) {
				content.querySelector('input[name="locationName"]').value = e.location.name;
				content.querySelector('input[name="longitude"]').value = e.location.longitude;
				content.querySelector('input[name="latitude"]').value = e.location.latitude;
				content.querySelector('input[name="altitude"]').value = e.location.altitude;
				content.querySelector('textarea[name="address"]').value = e.location.address;
			}
			if (e.data.indexOf('.mov') > 0 || e.data.indexOf('.mp4') > 0) {
				image = div.appendChild(document.createElement('video'));
				image.autoplay = true;
				image.muted = true;
				image.loop = true;
				image.setAttribute('playsinline', true);
				var source = image.appendChild(document.createElement('source'));
				source.src = e.data;
				source.type = 'video/mp4';
			} else {
				image = div.appendChild(document.createElement('img'));
				image.src = e.data;
			}
			image.parentElement.setAttribute('i', dialog.files.length);
			image.parentElement.setAttribute('onclick', 'action.eventImageDelete(event,' + dialog.files.length + ')');
			dialog.files.push(e);
		});
		var inputDate = dialog.createField(element, 'Datum', 'date', 'input-date', event?.year ? event.year + '-' + event.month + '-' + event.day + ' ' + new Date().getHours() + ':00' : null);
		var date = new Date();
		date.setMonth(date.getMonth() - 2);
		inputDate.setAttribute('minuteStep', 15);
		inputDate.setAttribute('min', date.toISOString());
		document.querySelector('event sortable-table').table().querySelectorAll('tr>td:first-child').forEach(td => inputDate.addOccupied(new Date(parseInt(td.getAttribute('value')))));
		var location = dialog.createField(element, 'Ortname', 'locationName', 'input').parentElement;
		var buttonToggle = location.appendChild(document.createElement('span'));
		buttonToggle.innerText = '+';
		buttonToggle.setAttribute('style', 'position: absolute; cursor: pointer; background: rgba(100, 150, 200, 0.2); color: white; top: 0.31em; right: 0.31em; border-radius: 0 0.3em 0.3em 0; width: 1.32em; height: 1.25em; font-size: 1.6em; text-align: center; padding: 0 0.16em;');
		buttonToggle.onclick = () => {
			var classList = document.querySelector('dialog-popup').content().querySelector('input-selection').classList;
			if (classList.contains('open'))
				classList.remove('open');
			else
				classList.add('open');
		};
		location.appendChild(document.createElement('input-selection')).addEventListener('changed', event => {
			document.querySelector('dialog-popup').content().querySelector('input[name="locationName"]').value = event.detail.label.split(' · ')[0];
			document.querySelector('dialog-popup').content().querySelector('textarea[name="address"]').value = event.detail.label.split(' · ')[1].replace(/, /g, '\n');
		});
		var address = dialog.createField(element, 'Adresse', 'address', 'textarea');
		var input = address.parentElement.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', 'longitude');
		input = address.parentElement.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', 'latitude');
		input = address.parentElement.appendChild(document.createElement('input'));
		input.setAttribute('type', 'hidden');
		input.setAttribute('name', 'altitude');
		if (navigator.geolocation) {
			var locationButton = address.parentElement.appendChild(document.createElement('button'));
			locationButton.src = 'image/location.svg';
			locationButton.classList.add('icon');
			locationButton.classList.add('location');
			locationButton.onclick = () => {
				navigator.geolocation.getCurrentPosition(result => {
					if (result.coords && result.coords.latitude) {
						api.location.getAddress(result.coords.latitude, result.coords.longitude, e => {
							var popup = document.querySelector('dialog-popup').content();
							popup.querySelector('element input[name="locationName"]').value = e.name;
							popup.querySelector('element textarea[name="address"]').value = e.address;
							popup.querySelector('element input[name="longitude"]').value = result.coords.longitude;
							popup.querySelector('element input[name="latitude"]').value = result.coords.latitude;
							popup.querySelector('element input[name="altitude"]').value = result.coords.altitude;
							var locationButton = popup.querySelector('button.location');
							if (locationButton)
								locationButton.remove();
						});
					}
				}, error => console.warn('Location lookup failed:', error && error.code, error && error.message),
					{ timeout: 10000, maximumAge: 10000, enableHighAccuracy: true });
			};
		}
		dialog.createField(element, 'Bemerkung', 'note', 'input-textarea');
		dialog.createField(element, 'Bewertung', 'rating', 'input-rating').setAttribute('type', 'edit');
		var buttonDiv = dialog.createButton(element, 'action.eventPost()');
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
		document.dispatchEvent(new CustomEvent('location'));
		location.querySelector('input-selection')._root.querySelector('input').style.marginTop = '1em';
	}

	static addUser() {
		var popup = document.createElement('div');
		dialog.createField(popup, 'Name', 'name');
		dialog.createField(popup, 'Email', 'email');
		dialog.createButton(popup, 'action.contactPatch()');
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
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

${dialog.stylePictures}`;
		if (api.user.admin || contact.id == api.user.id) {
			popup.style.minWidth = '20em';
			var id = popup.appendChild(document.createElement('input'));
			id.setAttribute('type', 'hidden');
			id.setAttribute('name', 'id');
			id.value = contact.id;
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

	static event(event) {
		var popup = document.createElement('div');
		popup.appendChild(document.createElement('style')).textContent = `
element {
	width: 40em;
	max-width: 100%;
	display: block;
}`;
		var element = popup.appendChild(document.createElement('element'));
		var inputDate = dialog.createField(element, 'Datum', 'date', 'input-date', event.date);
		var date = new Date();
		date.setMonth(date.getMonth() - 2);
		inputDate.setAttribute('minuteStep', 15);
		inputDate.setAttribute('min', date.toISOString());
		document.querySelector('event sortable-table').table().querySelectorAll('tr>td:first-child').forEach(td => inputDate.addOccupied(new Date(parseInt(td.getAttribute('value')))));
		dialog.createField(element, 'Bemerkung', 'note', 'textarea', event.note).style.height = '12em';
		dialog.createField(element, 'Ort', 'locationId', 'input-selection').classList.add('open');
		var inputId = element.appendChild(document.createElement('input'));
		inputId.setAttribute('type', 'hidden');
		inputId.setAttribute('name', 'id');
		inputId.setAttribute('value', event.id);
		var buttonDiv = dialog.createButton(element, 'action.eventPatch()');
		var button = buttonDiv.appendChild(document.createElement('button'));
		button.innerText = 'Löschen';
		button.setAttribute('onclick', 'api.event.delete(' + event.id + ',()=>{document.dispatchEvent(new CustomEvent("popup"));document.dispatchEvent(new CustomEvent("event"));})');
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
		document.dispatchEvent(new CustomEvent('location', { detail: { id: event.location.id } }));
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

	static feedback(feedback) {
		var popup = document.createElement('div');
		var textarea = popup.appendChild(document.createElement('textarea'));
		textarea.value = feedback.note;
		textarea.setAttribute('name', 'note');
		var id = popup.appendChild(document.createElement('input'));
		id.setAttribute('name', 'id');
		id.setAttribute('type', 'hidden');
		id.value = feedback.id;
		var div = popup.appendChild(document.createElement('div'));
		div.style.textAlign = 'center';
		div.style.marginTop = '0.75em';
		var button = div.appendChild(document.createElement('button'));
		button.innerText = 'Speichern';
		button.setAttribute('onclick', 'action.feedbackPut()');
		var button = div.appendChild(document.createElement('button'));
		button.innerText = 'Löschen';
		button.setAttribute('onclick', 'action.feedbackDelete()');
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
	}

	static client() {
		var popup = document.createElement('div');
		var selection = popup.appendChild(document.createElement('input-selection'));
		selection.setAttribute('value', api.clientId);
		var keys = Object.keys(api.clients);
		for (var i = 0; i < keys.length; i++)
			selection.add(keys[i], api.clients[keys[i]].name);
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
		document.querySelector('dialog-popup').content().querySelector('input-selection').addEventListener('changed', () => {
			api.clientId = document.querySelector('dialog-popup').content().querySelector('input-selection').getAttribute('value');
			document.dispatchEvent(new CustomEvent('event'));
			document.dispatchEvent(new CustomEvent('contact'));
			document.dispatchEvent(new CustomEvent('popup'));
		});
	}
}
