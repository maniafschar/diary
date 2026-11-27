export { splitHashtags, renderHashtagButtons, hashtagButtonsMarkup, hashtagButtonStyle };

const hashtagButtonStyle = `
hashtag-buttons {
	display: flex;
	overflow-x: auto;
	overflow-y: hidden;
	width: 100%;
	padding-top: 0.5em;
	margin: 0 0.5em;
	white-space: nowrap;
}
hashtag-buttons button {
	border-radius: 2em;
	border: none;
	background: var(--background-clickable);
	padding: 0.5em 0.75em;
	outline: none;
	cursor: pointer;
	font-family: var(--font-family);
	margin: 0 0.5em;
	color: white;
	font-size: 0.8em;
	transition: var(--transition-clickable);
}
hashtag-buttons button.pressed {
	background: var(--background-clickable-highlight);
}
hashtag-buttons button .count {
	font-size: 0.8em;
	opacity: 0.6;
	margin-left: 0.35em;
}`;

function splitHashtags(value) {
	return (value || '').split(',').map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean);
}

function hashtagButtonsMarkup(tags, selected = []) {
	return '<hashtag-buttons>' + tags.map(tag => {
		var pressed = selected.some(value => value.toLocaleLowerCase() == tag.toLocaleLowerCase());
		return '<button type="button"' + (pressed ? ' class="pressed"' : '') + '>' +
			tag.replace(/[&<>"']/g, character => ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[character]) + '</button>';
	}).join('') + '</hashtag-buttons>';
}

function renderHashtagButtons(container, tags, selected, toggle, counts) {
	container.replaceChildren();
	tags.forEach(tag => {
		const button = container.appendChild(document.createElement('button'));
		button.type = 'button';
		button.textContent = tag;
		if (counts) {
			const count = button.appendChild(document.createElement('span'));
			count.className = 'count';
			count.textContent = String(counts.get(tag.toLocaleLowerCase()) || 0);
		}
		if (selected.some(value => value.toLocaleLowerCase() == tag.toLocaleLowerCase()))
			button.classList.add('pressed');
		else
			button.classList.remove('pressed');
		button.onclick = () => toggle(tag, button);
	});
}
