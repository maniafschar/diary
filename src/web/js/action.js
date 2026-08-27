import { api } from "./api";
import { dialog } from "./dialog";
import { ViewCalendar } from "./element/ViewCalendar";
import { ViewMap } from "./element/ViewMap";
import { DialogPopup } from "./element/DialogPopup";
import { ViewImage } from "./element/ViewImage";
import { InputCheckbox } from "./element/InputCheckbox";
import { InputDate } from "./element/InputDate";
import { InputImage } from "./element/InputImage";
import { InputRating } from "./element/InputRating";
import { InputSelection } from "./element/InputSelection";
import { InputTextarea } from "./element/InputTextarea";
import { ProgressBar } from "./element/ProgressBar";
import { TableSortable } from "./element/TableSortable";
import { listener } from "./listener";
import { ui } from "./ui";

export { action };

class action {
	static init() {
		window.onresize();
		listener.init();
		if (document.location.search) {
			var popup = document.createElement('div');
			popup.appendChild(document.createElement('label')).innerText = 'Neues Passwort';
			var field = popup.appendChild(document.createElement('field'));
			var input = field.appendChild(document.createElement('input'));
			input.setAttribute('type', 'password');
			popup.appendChild(document.createElement('error'));
			input = field.appendChild(document.createElement('input'));
			input.setAttribute('type', 'hidden');
			input.setAttribute('value', document.location.search.substring(1));
			var div = popup.appendChild(document.createElement('div'));
			div.style.textAlign = 'center';
			var button = div.appendChild(document.createElement('button'));
			button.innerText = 'Passwort setzen!';
			button.onclick = action.loginResetPasswordPost;
			document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
			history.pushState(null, null, window.location.origin);
			api.activateProgressbar();
		} else
			api.authentication.getToken(success => {
				if (success)
					document.dispatchEvent(new CustomEvent('event'));
				else
					api.activateProgressbar();
			});
		setTimeout(function () { document.querySelector('body>container').style.opacity = 1; }, 400);
	}

	static addFeedback(eventId) {
		var note = document.querySelector('image-carousel').data().querySelector('textarea[name="feedback"]').value;
		if (note)
			api.event.postFeedback(eventId, { note: note }, () => {
				document.querySelector('image-carousel').data().querySelector('textarea[name="feedback"]').value = '';
				document.dispatchEvent(new CustomEvent('event'));
				var div = document.createElement('div');
				div.innerHTML = listener.listFeedbacks({ eventFeedbacks: [{ createdAt: new Date().toISOString(), note: note, contact: { id: api.user.id } }] });
				document.querySelector('image-carousel').data().querySelector('description').insertBefore(div.firstChild, document.querySelector('image-carousel').data().querySelector('separator'));
			});
	}

	static feedbackPut() {
		var note = document.querySelector('dialog-popup').content().querySelector('textarea[name="note"]').value;
		if (note)
			api.event.putFeedback(document.querySelector('dialog-popup').content().querySelector('input[name="id"]').value, { note: note }, () => {
				document.dispatchEvent(new CustomEvent('popup'));
				document.dispatchEvent(new CustomEvent('event'));
			});
	}

	static feedbackDelete() {
		api.event.deleteFeedback(document.querySelector('dialog-popup').content().querySelector('input[name="id"]').value, () => {
			document.dispatchEvent(new CustomEvent('popup'));
			document.dispatchEvent(new CustomEvent('event'));
		});
	}

	static addImage(event) {
		var chooseFile = () => {
			event.contactEvents.push({ contact: { id: api.user.id } });
			var image = document.querySelector('image-carousel').data().querySelector('input-image');
			image.setSuccess(file => {
				var formData = new FormData();
				formData.append('file', file.file);
				api.event.postImage(event.id, file.type, formData, true,
					() => {
						document.querySelector('image-carousel').indexImage++;
						document.dispatchEvent(new CustomEvent('event'));
						document.dispatchEvent(new CustomEvent('popup'));
					})
			});
			image.click();
		};
		action.addWithParticipation(event, chooseFile, 'Du kannst nur Bilder zu Events hochladen, an denen Du teilgenommen hast.');
	}

	static addRating(event, value) {
		action.addWithParticipation(event, () => api.event.putRating(event.id, value, () => {
			document.dispatchEvent(new CustomEvent('event'));
			document.dispatchEvent(new CustomEvent('popup'));
		}), 'Du kannst nur Events bewerten, an denen Du teilgenommen hast.');
	}

	static addWithParticipation(event, exec, text) {
		if (event.contactEvents) {
			for (var i = 0; i < event.contactEvents.length; i++) {
				if (event.contactEvents[i].contact.id == api.user.id) {
					exec();
					return;
				}
			}
		}
		var popup = document.createElement('div');
		popup.style.textAlign = 'center';
		popup.appendChild(document.createTextNode(text + ' Hast Du an dem Event teilgenommen?'));
		popup.appendChild(document.createElement('br'));
		popup.appendChild(document.createElement('br'));
		var button = popup.appendChild(document.createElement('button'));
		button.innerText = 'Ja';
		button.onclick = () => api.contact.postEvent(api.user.id, event.id, exec);
		button = popup.appendChild(document.createElement('button'));
		button.innerText = 'Nein';
		button.onclick = () => document.dispatchEvent(new CustomEvent('popup'));
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: popup } }));
	}

	static login() {
		var input = document.querySelectorAll('element.login input');
		if (input[0].value?.indexOf('@') < 1)
			document.querySelector('element.login error').innerText = 'Gib bitte Deine Email ein.';
		else if (!input[1].value)
			document.querySelector('element.login error').innerText = 'Ein Passwort wird benötigt.';
		else
			api.authentication.getLogin(input[0].value, input[1].value, document.querySelector('element.login input-checkbox[name="login"]').getAttribute('checked') == 'true', success => {
				if (success) {
					document.querySelector('body button.add').style.display = api.user.admin ? 'block' : 'none';
					document.dispatchEvent(new CustomEvent('event'));
				}
			});
	}

	static loginResetPassword() {
		var email = document.querySelector('element.login input[name="email"]').value;
		if (email.indexOf('@') < 1)
			document.querySelector('element.login error').innerText = 'Gib bitte Deine Email ein.';
		else
			api.authentication.getVerify(email, e => {
				if (e == 'ok') {
					document.querySelectorAll('element.login [i="login"]').forEach(e => e.value = '');
					document.dispatchEvent(new CustomEvent('popup', { detail: { body: 'Eine Email wurde Dir zugesendet. Klicke auf den Link in der Email, um Dein Passwort neu zu setzen.' } }));
				} else
					document.querySelector('element.login error').innerText = e;
			});
	}

	static loginResetPasswordPost() {
		var popup = document.querySelector('dialog-popup').content();
		if (popup.querySelector('input[type="password"]').value.length > 5)
			api.authentication.postVerify(popup.querySelector('input[type="hidden"]').value,
				popup.querySelector('input[type="password"]').value, () => document.dispatchEvent(new CustomEvent('popup')));
		else
			popup.querySelector('error').innerText = 'Gib Bitte ein Passwort ein.';
	}

	static loginVerify(contact) {
		api.contact.patch(contact, () => {
			api.authentication.getVerify(contact.email, e => {
				if (e == 'ok') {
					document.querySelector('user table-sortable').table().querySelector('td[contact*="\\"id\\":' + contact.id + ',"]').innerText = '...';
					document.dispatchEvent(new CustomEvent('popup', { detail: { body: 'Eine Email wurde gesendet. Nach dem Klick auf den Link in der Email ist der Benutzer verifiziert.' } }));
				} else
					document.querySelector('element.login error').innerText = e;
			});
		});

	}

	static loginDemo() {
		var input = document.querySelectorAll('element.login input');
		input[0].value = 'sepp@diary.cafe';
		input[1].value = 'Test1234';
		document.querySelector('element.login input-checkbox').setAttribute('checked', 'false');
		setTimeout(action.login, 500);
	}

	static createClient() {
		var legalCheck = document.querySelector('element.login input-checkbox[name="legal"]');
		legalCheck.style.color = '';
		var client = {
			name: document.querySelector('element.login input[name="clientName"]').value,
			contacts: [
				{
					name: document.querySelector('element.login input[name="contactName"]').value,
					email: document.querySelector('element.login input[name="contactEmail"]').value
				}
			]
		};
		if (client.contacts[0].email?.indexOf('@') < 1)
			document.querySelector('element.login error.createClient').innerText = 'Gib bitte Deine Email ein.';
		else if (!client.name || !client.contacts[0].name)
			document.querySelector('element.login error.createClient').innerText = 'Vervollständige bitte die Daten.';
		else if (legalCheck.getAttribute('checked') != 'true') {
			document.querySelector('element.login error.createClient').innerText = 'Akzeptiere unsere ABGs.';
			legalCheck.style.color = 'red';
		} else
			api.authentication.postCreate(client, () => {
				document.querySelectorAll('element.login [i="create"]').forEach(e => e.value = '');
				document.querySelector('element.login input-checkbox[name="legal"]').setAttribute('checked', 'false');
				document.dispatchEvent(new CustomEvent('popup', { detail: { body: 'Lieben Dank für Deine Registrierung, eine Email wurde Dir zugesendet. Bestätige diese, um in Deine neue Gruppe zu gelangen.' } }));
			});
	}

	static logoff() {
		api.authentication.deleteToken();
		api.logoff();
		document.querySelectorAll('event table-sortable, user table-sortable').forEach(e => e.table().querySelector('tbody').textContent = '');
		document.querySelector('element.event').style.display = '';
		document.querySelector('element.login').style.display = '';
		document.querySelector('element.calendar').style.display = '';
		document.querySelector('element.user').style.display = '';
		document.querySelector('body>[name="logoff"]').style.display = 'none';
		document.querySelector('body>[name="clientName"]').innerText = '';
	}

	static eventImageDelete(event, id) {
		var e = document.querySelector('dialog-popup').content().querySelector('value.pictures [i="' + id + '"]');
		var popup = true;
		if (!e) {
			e = document.querySelector('image-carousel').data().querySelector('thumbnail[i="' + id + '"]');
			popup = false;
		}
		if (e.querySelector('delete')) {
			if (event.target.nodeName == 'DELETE') {
				if (popup)
					e.remove();
				else
					api.event.deleteImage(id, () => {
						e.remove();
						document.dispatchEvent(new CustomEvent('event'));
					});
			} else
				e.querySelector('delete').remove();
		} else
			e.appendChild(document.createElement('delete')).innerText = 'Löschen?';
	}

	static eventPatch() {
		var popup = document.querySelector('dialog-popup').content();
		var date = popup.querySelector('element input-date').getAttribute('value');
		if (date) {
			api.event.patch({
				id: popup.querySelector('element input[name="id"]').value,
				date: date,
				note: popup.querySelector('element input-textarea[name="note"]').value,
				location: {
					id: popup.querySelector('element input-selection[name="locationId"]').getAttribute('value')

				}
			}, () => {
				document.dispatchEvent(new CustomEvent('event'));
				document.dispatchEvent(new CustomEvent('popup'));
			});
		}
	}

	static eventPost() {
		var popup = document.querySelector('dialog-popup').content();
		var date = popup.querySelector('element input-date').getAttribute('value');
		if (date) {
			var event = {
				date: date,
				note: popup.querySelector('element input-textarea[name="note"]').value,
				rating: popup.querySelector('element input-rating').getAttribute('value'),
				location: {
					name: popup.querySelector('element input[name="locationName"]').value,
					address: popup.querySelector('element textarea[name="address"]').value,
					longitude: popup.querySelector('element input[name="longitude"]').value,
					latitude: popup.querySelector('element input[name="latitude"]').value,
					altitude: popup.querySelector('element input[name="altitude"]').value
				}
			};
			document.dispatchEvent(new CustomEvent('progressbar', { detail: { type: 'open' } }));
			api.event.postExists(event, exists => {
				if (exists == 'false') {
					api.event.post(event, id => {
						var call = (pictures, index) => {
							if (pictures[index]) {
								var formData = new FormData();
								formData.append('file', dialog.files[pictures[index].getAttribute('i')].file);
								api.event.postImage(id, 'jpg', formData, false, () => call(pictures, index + 1));
							} else {
								document.dispatchEvent(new CustomEvent('progressbar'));
								document.dispatchEvent(new CustomEvent('event'));
								document.dispatchEvent(new CustomEvent('popup'));
							}
						};
						call(popup.querySelectorAll('element value.pictures div'), 0);
					});
				} else {
					document.dispatchEvent(new CustomEvent('progressbar'));
					document.dispatchEvent(new CustomEvent('popup', { detail: { body: 'Der Eintrag existiert bereits.' } }));
				}
			});
		}
	}

	static contactPatch() {
		var popup = document.querySelector('dialog-popup').content();
		var contact = {
			id: popup.querySelector('input[name="id"]')?.value || null,
			name: popup.querySelector('input[name="name"]').value,
			email: popup.querySelector('input[name="email"]').value,
			client: {
				name: popup.querySelector('input[name="clientName"]')?.value || null,
				none: popup.querySelector('input[name="clientNote"]')?.value || null,
				image: popup.querySelector('input[name="clientImage"]')?.value || null
			}
		};
		api.contact.patch(
			contact,
			id => {
				if (contact.client.name)
					document.querySelector('body>[name="clientName"]').innerText = contact.client.name;
				document.dispatchEvent(new CustomEvent('contact', { detail: { id: id } }));
				document.dispatchEvent(new CustomEvent('popup'));
			}
		);
	}

	static participate(contactId, eventId) {
		var popup = document.querySelector('dialog-popup').content();
		var fireEvent = type => {
			var participants = [];
			var selected = popup.querySelectorAll('value[i="' + eventId + '"] item.selected');
			for (var i = 0; i < selected.length; i++)
				participants.push({ id: selected[i].getAttribute('i'), pseudonym: selected[i].innerText });
			document.dispatchEvent(new CustomEvent('event'));
		};
		var e = popup.querySelector('value[i="' + eventId + '"] item[i="' + contactId + '"]');
		if (e.getAttribute('contactEventId')) {
			api.contact.deleteEvent(e.getAttribute('contactEventId'), () => {
				e.classList.remove('selected');
				e.removeAttribute('contactEventId');
				fireEvent('remove');
			});
		} else {
			api.contact.postEvent(contactId, eventId, id => {
				e.classList.add('selected');
				e.setAttribute('contactEventId', id);
				fireEvent('add');
			});
		}
	}
}

window.onresize = function () {
	var mobile = parseFloat(getComputedStyle(document.body).fontSize) * 50 < window.innerWidth ? 0 : 5;
	var diagonal = Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2));
	var fontSize = (Math.min(7 + diagonal / 160, 26) + mobile);
	if (mobile && fontSize > 18)
		fontSize = 18;
	document.body.style.fontSize = fontSize + 'px';
	var imageWidth = 1536, imageHeight = 1024;
	var imageStyle = document.querySelector('body element.intro>img').style;
	if (window.innerHeight / imageHeight * imageWidth > window.innerWidth) {
		imageStyle.height = window.innerHeight;
		imageStyle.width = 'fit-content';
		imageStyle.marginTop = 0;
	} else {
		imageStyle.width = window.innerWidth;
		imageStyle.height = 'fit-content';
		imageStyle.marginTop = window.innerHeight - window.innerWidth / imageWidth * imageHeight;
	}
}

customElements.define('view-calendar', ViewCalendar);
customElements.define('view-map', ViewMap);
customElements.define('dialog-popup', DialogPopup);
customElements.define('view-image', ViewImage);
customElements.define('input-date', InputDate);
customElements.define('input-checkbox', InputCheckbox);
customElements.define('input-image', InputImage);
customElements.define('input-rating', InputRating);
customElements.define('input-selection', InputSelection);
customElements.define('input-textarea', InputTextarea);
customElements.define('progress-bar', ProgressBar);
customElements.define('table-sortable', TableSortable);

window.api = api;
window.action = action;
window.listener = listener;
window.dialog = dialog;
window.ui = ui;
