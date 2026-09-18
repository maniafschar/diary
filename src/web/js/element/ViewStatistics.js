import { api } from './api';

export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
`;
	}

	init() {
		if (this._root.childElementCount > 1)
			return;
		api.statistics.getWordcloud(e => {
			this._root.appendChild(document.createElement('img')).src = btoa(e);
		});
	}
}
