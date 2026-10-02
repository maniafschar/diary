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
		document.querySelector('elementContainer').style.marginLeft = (-i * 100) + '%';
		document.querySelectorAll('elementContainer>element')[i].dispatchEvent(new CustomEvent('visible'));
	}

	static openMoreMenu() {
		var menu = document.createElement('div');
		menu.style.display = 'flex';
		menu.style.flexDirection = 'column';
		menu.style.gap = '0.5rem';
		menu.style.minWidth = '12rem';
		[...document.querySelectorAll('body navigation button.icon.mobile-more-item')].forEach(button => {
			var item = menu.appendChild(document.createElement('button'));
			item.type = 'button';
			item.style.margin = '0';
			item.style.padding = '0.7rem 0.85rem';
			item.style.borderRadius = '0.75rem';
			item.style.display = 'flex';
			item.style.alignItems = 'center';
			item.style.justifyContent = 'flex-start';
			item.style.gap = '0.6rem';
			item.style.background = 'rgba(0, 0, 0, 0.04)';
			item.style.color = 'black';
			var icon = button.querySelector('img, svg');
			if (icon)
				item.appendChild(icon.cloneNode(true));
			var label = document.createElement('span');
			label.textContent = button.querySelector('span')?.textContent || '';
			item.appendChild(label);
			item.onclick = button.onclick;
		});
		document.dispatchEvent(new CustomEvent('popup', { detail: { body: menu } }));
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
