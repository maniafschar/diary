import { api } from '../api';

export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.parentElement.addEventListener('visible', () => this.init(), { once: true });
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
		width: 100%;
		height: 100%;
		position: relative;
		display: block;
}
.wordcloud {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		text-align: center;
}
.word {
		position: absolute;
		transform: translate(-50%, -50%);
		cursor: pointer;
		font-family: Arial, sans-serif;
		font-weight: bold;
		line-height: 1;
		user-select: none;
}
.word:hover {
		text-decoration: underline;
}`;
	}

	init() {
		api.statistics.getWordcloud(tokens => this.render(tokens));
	}

	render(tokens) {
		const cloud = document.createElement('div');
		cloud.className = 'wordcloud';

		const max = tokens.length ? tokens[0].count : 1;
		const min = tokens.length ? tokens[tokens.length - 1].count : 1;

		// Place the most frequent words near the center and the others progressively farther away.
		tokens.forEach((token, index) => {
			const ratio = (token.count - min) / (max - min || 1);
			const angle = index * 2.399963229728653;
			const radius = index === 0 ? 0 : 8 + index * 5;
			const span = document.createElement('span');

			span.className = 'word';
			span.textContent = token.text;
			span.title = `${token.text}: ${token.count}`;
			span.dataset.word = token.text;
			span.dataset.count = token.count;
			span.style.left = `${50 + Math.cos(angle) * radius}%`;
			span.style.top = `${50 + Math.sin(angle) * radius}%`;
			span.style.fontSize = `${12 + ratio * 42}px`;
			span.style.color = this.createColor(ratio);

			span.addEventListener('click', event => {
				this.dispatchEvent(new CustomEvent('wordclick', {
					detail: token,
					bubbles: true,
					composed: true
				}));
			});

			cloud.appendChild(span);
		});

		this._root.replaceChildren(this._root.querySelector('style'), cloud);
	}

	createColor(ratio) {
		if (ratio > 0.45)
			return `rgb(0, 0, ${255 - Math.round(ratio * 150)})`;
		if (ratio > 0.15)
			return `rgb(0, ${255 - Math.round(ratio * 150)}, 0)`;
		return `rgb(${255 - Math.round(ratio * 150)}, 0, 0)`;
	}
}
