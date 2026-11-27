export { splitHashtags, renderHashtags, hashtagsMarkup, hashtagStyle };

const hashtagStyle = `
hashtags {
	display: block;
	overflow-x: auto;
	overflow-y: hidden;
	width: 100%;
	padding-top: 0.5em;
	margin: 0 0.5em;
	white-space: nowrap;
	text-align: center;
}
hashtags hashtag {
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
hashtags hashtag.pressed {
	background: var(--background-clickable-highlight);
}
hashtags hashtag .count {
	font-size: 0.8em;
	opacity: 0.6;
	margin-left: 0.35em;
}`;

function splitHashtags(value) {
	return (value || '').split(',').map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean);
}

function hashtagsMarkup(tags, selected = []) {
	return '<hashtags>' + tags.map(tag => {
		var pressed = selected.some(value => value.toLocaleLowerCase() == tag.toLocaleLowerCase());
		return '<hashtag' + (pressed ? ' class="pressed"' : '') + '>' +
			tag.replace(/[&<>"']/g, character => ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[character]) + '</hashtag>';
	}).join('') + '</hashtags>';
}

function renderHashtags(container, tags, selected, toggle, counts) {
	container.replaceChildren();
	tags.forEach(tag => {
		const hashtag = container.appendChild(document.createElement('hashtag'));
		hashtag.textContent = tag;
		if (counts) {
			const count = hashtag.appendChild(document.createElement('span'));
			count.className = 'count';
			count.textContent = String(counts.get(tag.toLocaleLowerCase()) || 0);
		}
		if (selected.some(value => value.toLocaleLowerCase() == tag.toLocaleLowerCase()))
			hashtag.classList.add('pressed');
		else
			hashtag.classList.remove('pressed');
		hashtag.onclick = () => toggle(tag, hashtag);
	});
}
