export { InputMap };

class InputMap extends HTMLElement {
	static leaflet;
	map = null;
	marker = null;
	moved = false;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	static load() {
		if (!InputMap.leaflet)
			InputMap.leaflet = window.L ? Promise.resolve() : new Promise((resolve, reject) => {
				var script = document.createElement('script');
				script.onload = resolve;
				script.onerror = reject;
				script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
				document.head.appendChild(script);
			});
		return InputMap.leaflet;
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	position: relative;
	display: block;
	width: 100%;
	height: 15em;
	border-radius: 0.5em;
	overflow: hidden;
	margin-bottom: 1em;
}
.leaflet-container .leaflet-control-attribution {
	background: transparent !important;
}
div {
	width: 100%;
	height: 100%;
}`;
		var link = this._root.appendChild(document.createElement('link'));
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
		var container = this._root.appendChild(document.createElement('div'));
		InputMap.load().then(() => {
			var latitude = parseFloat(this.getAttribute('latitude'));
			var longitude = parseFloat(this.getAttribute('longitude'));
			var located = !isNaN(latitude) && !isNaN(longitude);
			this.map = L.map(container, { zoomControl: true })
				.setView(located ? [latitude, longitude] : [48.137154, 11.576124], located ? 15 : 4);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 19
			}).addTo(this.map);
			if (located)
				this.setMarker(latitude, longitude);
			this.map.on('click', event => this.moveMarker(event.latlng.lat, event.latlng.lng));
			// the dialog scales in, so the map has to be remeasured once its size is final
			new ResizeObserver(() => this.map.invalidateSize()).observe(this);
		});
	}

	setMarker(latitude, longitude) {
		this.marker = L.marker([latitude, longitude], {
			draggable: true,
			icon: L.icon({
				iconUrl: 'image/marker-icon.png',
				iconRetinaUrl: 'image/marker-icon-2x.png',
				iconSize: [34, 46],
				iconAnchor: [20, 45],
				shadowUrl: 'image/marker-shadow.png',
				shadowSize: [60, 50],
				shadowAnchor: [20, 45]
			})
		}).addTo(this.map);
		this.marker.on('dragend', () => {
			var position = this.marker.getLatLng();
			this.moveMarker(position.lat, position.lng);
		});
	}

	moveMarker(latitude, longitude) {
		if (this.marker)
			this.marker.setLatLng([latitude, longitude]);
		else
			this.setMarker(latitude, longitude);
		this.moved = true;
		this.dispatchEvent(new CustomEvent('changed', { detail: { latitude: latitude, longitude: longitude } }));
	}
}
