
export { InputImage };

class InputImage extends HTMLElement {
	success;
	examineExif = true;
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	position: absolute;
	background-color: rgba(100, 150, 200, 0.2);
	border-radius: 1em;
	color: white;
	width: 2em;
	height: 2em;
	text-align: center;
	display: inline-block;
	line-height: 2;
	font-size: 1.3em;
	z-index: 3;
}
input {
	opacity: 0;
	cursor: pointer;
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
}`;
		var element = document.createElement('input');
		element.setAttribute('type', 'file');
		element.setAttribute('onchange', 'this.getRootNode().host.load(this)');
		element.setAttribute('accept', '.gif, .png, .jpg, .mov, .mp4');
		this._root.appendChild(element);
		this._root.appendChild(document.createTextNode('+'));
	}
	setSuccess(success) {
		this.success = success;
	}
	click() {
		this._root.querySelector('input').click();
	}
	dataURItoBlob(dataURI) {
		var arr = dataURI.split(','), mime = arr[0].match(/:(.*?);/)[1];
		arr[1] = atob(arr[1]);
		var ab = new ArrayBuffer(arr[1].length);
		var ia = new Uint8Array(ab);
		for (var i = 0; i < arr[1].length; i++)
			ia[i] = arr[1].charCodeAt(i);
		return new Blob([ab], { type: mime });
	}
	load(e) {
		var file = e.files && e.files.length > 0 ? e.files[0] : null;
		if (file && this.success) {
			var reader = new FileReader();
			var t = this;
			reader.onload = function (r) {
				if (file.type?.indexOf('video') == 0)
					t.success({
						original: {
							size: file.size
						},
						name: file.name,
						type: file.name.indexOf('.') > 0 ? file.name.substring(file.name.lastIndexOf('.') + 1).trim() : file.type?.split('/')[1],
						data: r.target.result,
						file: file
					});
				else {
					var image = new Image();
					image.onload = function () {
						t.scale(image, scaled => {
							scaled.size = t.dataURItoBlob(scaled.data).size;
							var data = {
								original: {
									size: file.size,
									width: image.naturalWidth,
									height: image.naturalHeight
								},
								scaled: {
									size: scaled.size,
									width: scaled.width,
									height: scaled.height
								},
								name: file.name,
								type: 'jpg',
								data: scaled.data,
								file: scaled.file,
								sizeRatio: (100 - scaled.size / file.size * 100).toFixed(0)
							}
							if (t.examineExif && (file.type === 'image/jpeg' || file.type === 'image/jpg')) {
								file.arrayBuffer()
									.then(async buffer => {
										const exif = InputImage.parseExifFromArrayBuffer(buffer);
										if (exif.datetime)
											data.datetime = exif.datetime.replace(':', '-').replace(':', '-');
										if (exif.gps?.longitude)
											api.event.getAddress(exif.gps.latitude, exif.gps.longitude, e => {
												data.address = e;
												t.examineExif = false;
												t.success(data);
											});
										else
											t.success(data);
									});
							} else
								t.success(data);
						});
					};
					image.src = r.target.result;
				}
			};
			reader.readAsDataURL(file);
		}
	}
	scale(image, exec) {
		var canvas = document.createElement('canvas'), scale = 1;
		var ctx = canvas.getContext('2d'), max = parseInt(this.getAttribute('max'));
		if (image.naturalWidth > image.naturalHeight)
			scale = max / image.naturalWidth;
		else
			scale = max / image.naturalHeight;
		if (scale > 1)
			scale = 1;
		canvas.width = scale * image.naturalWidth;
		canvas.height = scale * image.naturalHeight;
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, canvas.width, canvas.height);
		var result = { data: canvas.toDataURL('image/jpeg', 0.9), width: parseInt(canvas.width + 0.5), height: parseInt(canvas.height + 0.5) };
		new Promise(resolve =>
			canvas.toBlob(blob => resolve(blob)
			)).then(blob => { result.file = blob; exec(result); }, err => { result.err = err; exec(result); });
	}
	static parseExifFromArrayBuffer(arrayBuffer) {
		const dataView = new DataView(arrayBuffer);

		function getString(offset, length) {
			let out = '';
			for (let i = 0; i < length; i += 1) {
				out += String.fromCharCode(dataView.getUint8(offset + i));
			}
			return out;
		}

		function getUint16(offset, littleEndian) {
			return dataView.getUint16(offset, littleEndian);
		}

		function getUint32(offset, littleEndian) {
			return dataView.getUint32(offset, littleEndian);
		}

		function getTypeSize(type) {
			switch (type) {
				case 1: // BYTE
				case 2: // ASCII
				case 7: // UNDEFINED
					return 1;
				case 3: // SHORT
					return 2;
				case 4: // LONG
				case 9: // SLONG
					return 4;
				case 5: // RATIONAL
				case 10: // SRATIONAL
					return 8;
				default:
					return 0;
			}
		}

		function getValue(entryOffset, type, count, littleEndian, tiffHeader) {
			const valueOffset = entryOffset + 8;
			const valueSize = getTypeSize(type) * count;
			const actualOffset = valueSize > 4
				? tiffHeader + getUint32(valueOffset, littleEndian)
				: valueOffset;

			if (type === 2) {
				return getString(actualOffset, count - 1);
			}

			if (type === 3) {
				if (count === 1) {
					return getUint16(actualOffset, littleEndian);
				}
				const values = [];
				for (let i = 0; i < count; i += 1) {
					values.push(getUint16(actualOffset + i * 2, littleEndian));
				}
				return values;
			}

			if (type === 4) {
				if (count === 1) {
					return getUint32(actualOffset, littleEndian);
				}
				const values = [];
				for (let i = 0; i < count; i += 1) {
					values.push(getUint32(actualOffset + i * 4, littleEndian));
				}
				return values;
			}

			if (type === 5 || type === 10) {
				const values = [];
				for (let i = 0; i < count; i += 1) {
					const numerator = getUint32(actualOffset + i * 8, littleEndian);
					const denominator = getUint32(actualOffset + i * 8 + 4, littleEndian);
					values.push(denominator ? numerator / denominator : null);
				}
				return count === 1 ? values[0] : values;
			}

			if (type === 7) {
				const bytes = [];
				for (let i = 0; i < count; i += 1) {
					bytes.push(dataView.getUint8(actualOffset + i));
				}
				return bytes;
			}

			return null;
		}

		const exif = {
			make: null,
			model: null,
			orientation: null,
			datetime: null,
			gps: null,
			imageWidth: null,
			imageHeight: null,
			software: null,
			focalLength: null,
			exposureTime: null,
			aperture: null,
			iso: null
		};

		if (getString(0, 2) !== '\xFF\xD8') {
			return { error: 'Not a JPEG file' };
		}

		let offset = 2;
		const length = dataView.byteLength;
		let littleEndian = false;
		let exifStart = -1;

		while (offset < length) {
			if (dataView.getUint8(offset) !== 0xFF) {
				break;
			}
			const marker = dataView.getUint8(offset + 1);
			const size = getUint16(offset + 2, false);
			if (marker === 0xE1 && getString(offset + 4, 4) === 'Exif') {
				exifStart = offset + 10;
				break;
			}
			offset += 2 + size;
		}

		if (exifStart < 0) {
			return { error: 'No EXIF segment found' };
		}

		const tiffHeader = exifStart;
		const byteOrder = getString(tiffHeader, 2);
		littleEndian = byteOrder === 'II';
		if (byteOrder !== 'II' && byteOrder !== 'MM') {
			return { error: 'Invalid TIFF byte order' };
		}

		const tagMark = getUint16(tiffHeader + 2, littleEndian);
		if (tagMark !== 0x002A) {
			return { error: 'Invalid TIFF header' };
		}

		const firstIFDOffset = getUint32(tiffHeader + 4, littleEndian);
		const ifd0Offset = tiffHeader + firstIFDOffset;

		function readIFD(offset, tagMap) {
			const numEntries = getUint16(offset, littleEndian);
			const values = {};
			for (let i = 0; i < numEntries; i += 1) {
				const entryOffset = offset + 2 + i * 12;
				const tag = getUint16(entryOffset, littleEndian);
				const type = getUint16(entryOffset + 2, littleEndian);
				const count = getUint32(entryOffset + 4, littleEndian);
				const value = getValue(entryOffset, type, count, littleEndian, tiffHeader);
				if (tagMap[tag]) {
					values[tagMap[tag]] = value;
				} else {
					values[tag] = value;
				}
			}
			return values;
		}

		const ifd0 = readIFD(ifd0Offset, {
			0x010F: 'make',
			0x0110: 'model',
			0x0112: 'orientation',
			0x0132: 'datetime',
			0x0100: 'imageWidth',
			0x0101: 'imageHeight',
			0x0131: 'software',
			0x8769: 'exifIFDPointer',
			0x8825: 'gpsIFDPointer'
		});

		Object.assign(exif, ifd0);

		if (ifd0.exifIFDPointer) {
			const exifOffset = tiffHeader + ifd0.exifIFDPointer;
			const exifFields = readIFD(exifOffset, {
				0x829A: 'exposureTime',
				0x829D: 'focalLength',
				0x8827: 'iso',
				0x9202: 'aperture'
			});
			Object.assign(exif, exifFields);
		}

		if (ifd0.gpsIFDPointer) {
			const gpsOffset = tiffHeader + ifd0.gpsIFDPointer;
			const gpsFields = readIFD(gpsOffset, {
				0x0001: 'latitudeRef',
				0x0002: 'latitude',
				0x0003: 'longitudeRef',
				0x0004: 'longitude',
				0x0005: 'altitudeRef',
				0x0006: 'altitude'
			});
			if (gpsFields.latitude && gpsFields.longitude) {
				const convertCoord = coord => coord[0] + coord[1] / 60 + coord[2] / 3600;
				const lat = convertCoord(gpsFields.latitude) * (gpsFields.latitudeRef === 'S' ? -1 : 1);
				const lon = convertCoord(gpsFields.longitude) * (gpsFields.longitudeRef === 'W' ? -1 : 1);
				exif.gps = {
					latitude: lat,
					longitude: lon,
					altitude: gpsFields.altitude,
					altitudeRef: gpsFields.altitudeRef
				};
			}
		}

		return exif;
	}
}