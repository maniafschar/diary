export { splitHashtags, renderHashtagButtons };

function splitHashtags(value) {
	return (value || '').split(',').map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean);
}

function renderHashtagButtons(container, tags, selected, toggle) {
	container.replaceChildren();
	tags.forEach(tag => {
		const button = container.appendChild(document.createElement('button'));
		button.type = 'button';
		button.textContent = '#' + tag;
		button.setAttribute('aria-pressed', String(selected.some(value => value.toLocaleLowerCase() == tag.toLocaleLowerCase())));
		button.onclick = () => toggle(tag);
	});
}
