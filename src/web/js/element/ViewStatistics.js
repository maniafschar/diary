import { api } from './api';

export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this.addEventListener('visible', () => this.init(), { once: true });
		this._root.appendChild(document.createElement('style')).textContent = `
`;
	}

	init() {
		api.statistics.getWordcloud(e => {
			this._root.appendChild(document.createElement('img')).src = btoa(e);
		});
	}
}
