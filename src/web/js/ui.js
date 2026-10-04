import { InputDate } from "./element/InputDate";

export { ui };

class ui {
	static day = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	static pseudonyms;

	static extractPseudonyms(contacts) {
		if (!contacts)
			return ui.pseudonyms;
		var firstnames = {};
		for (var i = 0; i < contacts.length; i++) {
			var name = contacts[i].name;
			if (!firstnames[name.split(' ')[0]])
				firstnames[name.split(' ')[0]] = [];
			firstnames[name.split(' ')[0]].push(name.substring(name.indexOf(' ') + 1).trim());
		}
		ui.pseudonyms = {};
		for (var i = 0; i < contacts.length; i++) {
			contacts[i].pseudonym = contacts[i].name.split(' ')[0];
			var lastnames = firstnames[contacts[i].pseudonym];
			if (lastnames.length > 1) {
				var lastname = contacts[i].name.substring(contacts[i].name.indexOf(' ') + 1);
				lastnames = [...lastnames];
				lastnames.splice(lastnames.indexOf(lastname), 1);
				var suffix = '';
				var found = true;
				var pos = 0;
				while (found && pos < lastname.length - 1) {
					found = false;
					suffix += lastname.substring(pos, pos++ + 1);
					for (var i2 = 0; i2 < lastnames.length; i2++) {
						if (lastnames[i2].indexOf(suffix) == 0) {
							found = true;
							break;
						}
					}
				}
				contacts[i].pseudonym += ' ' + suffix;
			}
			ui.pseudonyms['' + contacts[i].id] = contacts[i].pseudonym;
		}
		return ui.pseudonyms;
	}

	static formatTime(date, hint) {
		date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
		var suffix = '';
		if (hint) {
			var holiday = InputDate.bankholidays(date.getFullYear())[date.getDate() + '.' + (date.getMonth() + 1)];
			if (holiday)
				suffix = ' · ' + holiday;
		}
		return ui.day[date.getDay()] + ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.' + (date.getFullYear() - 2000) + ' ' + date.getHours() + ':' + date.getMinutes() + suffix;
	}

	static navigate(i) {
		var buttons = [...document.querySelectorAll('body navigation button[data-nav-index]')]
			.sort((a, b) => Number(a.dataset.navIndex) - Number(b.dataset.navIndex));
		buttons.forEach(e => e.classList.remove('selected'));
		var button = buttons.find(e => Number(e.dataset.navIndex) == i);
		if (button)
			button.classList.add('selected');
		var elements = [...document.querySelectorAll('elementContainer>element')];
		elements.forEach((element, index) => element.classList.toggle('active', index == i));
		elements[i]?.dispatchEvent(new CustomEvent('visible'));
	}

	static openMoreMenu() {
		var existing = document.querySelector('body > .mobile-nav-popup');
		if (existing) {
			existing.classList.remove('open');
			setTimeout(() => existing.remove(), 220);
			return;
		}
		var menu = document.createElement('div');
		menu.className = 'mobile-nav-popup';
		menu.setAttribute('role', 'menu');
		[...document.querySelectorAll('body navigation button.icon.mobile-more-item')].forEach(button => {
			var item = menu.appendChild(document.createElement('button'));
			item.type = 'button';
			item.className = 'mobile-nav-item';
			item.onclick = () => {
				menu.classList.remove('open');
				setTimeout(() => menu.remove(), 220);
				if (button.onclick)
					button.onclick();
			};
			var icon = button.querySelector('img, svg');
			if (icon)
				item.appendChild(icon.cloneNode(true));
			var label = document.createElement('span');
			label.textContent = button.querySelector('span')?.textContent || '';
			item.appendChild(label);
		});
		document.body.appendChild(menu);
		requestAnimationFrame(() => menu.classList.add('open'));
		var close = event => {
			if (!event || !menu.contains(event.target)) {
				menu.classList.remove('open');
				setTimeout(() => menu.remove(), 220);
				document.removeEventListener('click', close);
			}
		};
		setTimeout(() => document.addEventListener('click', close, { once: true }), 100);
	}

	static openImprint() {
		var e = document.querySelector('imprint');
		if (!e)
			return;
		if (e.classList.contains('open')) {
			e.classList.remove('open');
			return;
		}
		e.classList.add('open');
		e.onclick = event => {
			if (event.target === e)
				e.classList.remove('open');
		};
	}

	static parents(e, nodeName) {
		if (e) {
			nodeName = nodeName.toUpperCase();
			while (e && e.nodeName != nodeName)
				e = e.parentNode;
		}
		return e;
	}

	static toggle(event) {
		var toggle = ui.parents(event.target, 'toggle');
		var element = toggle.nextElementSibling;
		if (toggle.classList.contains('open')) {
			element.style.gridTemplateRows = '';
			toggle.classList.remove('open');
		} else {
			element.style.gridTemplateRows = '1fr';
			toggle.classList.add('open');
		}
	}
}
