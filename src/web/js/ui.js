import { InputDate } from "./element/InputDate";

export { ui };

class ui {
	static day = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

	static pseudonyms(contacts) {
		var firstnames = {};
		for (var i = 0; i < contacts.length; i++) {
			var name = contacts[i].name;
			if (!firstnames[name.split(' ')[0]])
				firstnames[name.split(' ')[0]] = [];
			firstnames[name.split(' ')[0]].push(name.substring(name.indexOf(' ') + 1).trim());
		}
		var pseudonyms = {};
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
			pseudonyms['' + contacts[i].id] = contacts[i].pseudonym;
		}
		return pseudonyms;
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

	static showTab(event) {
		var tabHeader = ui.parents(event.target, 'tabHeader');
		var i = [...tabHeader.children].indexOf(ui.parents(event.target, 'tab'));
		tabHeader.nextElementSibling.querySelector('container').style.marginLeft = -(i * 100) + '%';
		tabHeader.querySelector('tab.selected')?.classList.remove('selected');
		tabHeader.querySelectorAll('tab')[i].classList.add('selected');
		tabHeader.scrollBy({
			top: 0,
			left: i > 1 ? 500 : -500,
			behavior: 'smooth',
		});
	}
	static parents(e, nodeName) {
		if (e) {
			nodeName = nodeName.toUpperCase();
			while (e && e.nodeName != nodeName)
				e = e.parentNode;
		}
		return e;
	}
}