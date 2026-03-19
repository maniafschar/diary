import JSEncrypt from 'jsencrypt';

export { api };

class api {
	static url = '{placeholderServer}/rest/api/';
	static user;
	static progressbar = false;

	static logoff() {
		api.user = null;
	}

	static login(email, password, refreshToken, success) {
		api.user = { id: 0, password: password };
		document.querySelector('login error').innerText = '';
		api.ajax({
			url: 'authentication/login?email=' + encodeURIComponent(Encryption.encPUB(email)),
			error(response) {
				api.user = null;
				document.querySelector('login error').innerText = response.responseText;
			},
			success(contact) {
				if (contact) {
					api.user = contact;
					api.user.password = password;
					if (refreshToken)
						api.loginRefreshToken(() => success(contact));
					else
						success(contact);
				} else
					document.querySelector('login error').innerText = 'Login fehlgeschlagen';
			}
		});
	}

	static loginWithToken(success) {
		var token = window.localStorage && window.localStorage.getItem('login');
		if (token) {
			api.user = { id: 0 };
			api.ajax({
				url: 'authentication/token?token=' + encodeURIComponent(Encryption.encPUB(token)) + '&publicKey=' + encodeURIComponent(Encryption.jsEncrypt.getPublicKeyB64()),
				error: success,
				success(r) {
					if (r) {
						r.password = Encryption.jsEncrypt.decrypt(r.password);
						api.user = r;
						api.loginRefreshToken(success);
					} else {
						window.localStorage.removeItem('login');
						success();
					}
				}
			});
		} else
			success();
	}

	static loginRefreshToken(success) {
		api.ajax({
			url: 'authentication/token?publicKey=' + encodeURIComponent(Encryption.jsEncrypt.getPublicKeyB64()),
			method: 'PUT',
			error: success,
			success: response => {
				if (response) {
					api.loginDeleteToken();
					window.localStorage.setItem('login', Encryption.jsEncrypt.decrypt(response));
					success(true);
				} else
					success();
			}
		});
	}

	static loginVerify(email, success) {
		if (!api.user)
			api.user = { id: 0 };
		api.ajax({
			url: 'authentication/verify?email=' + encodeURIComponent(Encryption.encPUB(email)),
			success: success
		});
	}

	static loginVerifyPost(token, password, success) {
		api.user = { id: 0 };
		var x = 0;
		for (var i = 0; i < token.length; i++) {
			x += token.charCodeAt(i);
			if (x > 99999999)
				break;
		}
		var s2 = '' + x;
		s2 += token.substring(1, 11 - s2.length);
		api.ajax({
			url: 'authentication/verify?token=' + encodeURIComponent(Encryption.encPUB(token.substring(0, 10) + s2 + token.substring(10))) + '&password=' + encodeURIComponent(Encryption.encPUB(password)),
			method: 'POST',
			success: success
		});
	}

	static createClient(client, success) {
		api.user = { id: 0 };
		api.ajax({
			url: 'authentication/create',
			method: 'POST',
			body: client,
			success: success
		});
	}

	static loginDeleteToken() {
		var token = window.localStorage && window.localStorage.getItem('login');
		if (token)
			api.ajax({
				url: 'authentication/token?token=' + encodeURIComponent(Encryption.encPUB(token)),
				method: 'DELETE'
			});
	}

	static event(id, success) {
		api.ajax({
			url: 'event/' + id,
			success: success
		});
	}

	static eventDelete(id, success) {
		api.ajax({
			url: 'event/' + id,
			method: 'DELETE',
			success: success
		});
	}

	static eventsContact(contactId, success) {
		api.ajax({
			url: 'event/contact/' + contactId,
			success: success
		});
	}

	static events(success) {
		api.ajax({
			url: 'event',
			success: success
		});
	}

	static eventPost(event, success) {
		api.ajax({
			url: 'event',
			method: event.id ? 'PUT' : 'POST',
			body: event,
			success: success
		});
	}

	static eventFeedbackPost(eventId, feedback, success) {
		api.ajax({
			url: 'feedback/' + eventId,
			method: 'POST',
			body: feedback,
			success: success
		});
	}

	static eventImageDelete(eventImageId, success) {
		api.ajax({
			url: 'event/image/' + eventImageId,
			method: 'DELETE',
			success: success
		});
	}

	static eventImagePost(id, type, data, success) {
		api.ajax({
			url: 'event/image/' + id + '/' + type,
			method: 'POST',
			body: { image: data },
			success: success
		});
	}

	static eventRatingPut(id, rating, success) {
		api.ajax({
			url: 'event/rating/' + id + '/' + rating,
			method: 'PUT',
			success: success
		});
	}

	static locations(success) {
		api.ajax({
			url: 'location',
			success: success
		});
	}

	static locationPut(location, success) {
		api.ajax({
			url: 'location',
			method: 'PUT',
			body: location,
			success: success
		});
	}

	static nearby(latitude, longitude, name, success) {
		api.ajax({
			url: 'nearby?latitude=' + latitude + '&longitude=' + longitude + '&name=' + encodeURIComponent(name),
			success: success
		});
	}

	static contact(id, success) {
		api.ajax({
			url: 'contact/' + id,
			success: success
		});
	}

	static contacts(success) {
		api.ajax({
			url: 'contact',
			success: success
		});
	}

	static contactPatch(contact, success) {
		api.ajax({
			url: 'contact',
			method: 'PATCH',
			body: contact,
			success: success
		});
	}

	static contactEventPost(contactId, eventId, success) {
		api.ajax({
			url: 'contact/event/' + contactId + '/' + eventId,
			method: 'POST',
			success: success
		});
	}

	static contactEventDelete(id, success) {
		api.ajax({
			url: 'contact/event/' + id,
			method: 'DELETE',
			success: success
		});
	}

	static activateProgressbar() {
		setTimeout(() => api.progressbar = true, 200);
	}

	static ajax(param) {
		if (!api.user?.id && api.user?.id != 0)
			return;
		if (!param.method)
			param.method = 'GET';
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4) {
				if (!param.noProgressBar && api.progressbar)
					document.dispatchEvent(new CustomEvent('progressbar'));
				if (xhr.status >= 200 && xhr.status < 300) {
					if (param.success) {
						var response = xhr.responseText;
						if (response && (response.indexOf('{') === 0 || response.indexOf('[') === 0)) {
							try {
								response = JSON.parse(xhr.responseText)
							} catch (e) {
							}
						}
						param.success(response);
					}
				} else {
					if (api.user?.id == 0)
						api.user = null;
					if (xhr.status < 500) {
						var xhrError = new XMLHttpRequest();
						xhrError.open('POST', api.url + 'ticket', true);
						xhrError.setRequestHeader('Content-Type', 'application/json');
						xhrError.send(JSON.stringify({ note: param.method + ' ' + param.url + ' -> ' + xhr.status + ' ' + xhr.responseURL + '\n' + xhr.response }));
					}
					if (param.error) {
						xhr.param = param;
						param.error(xhr);
					} else
						document.dispatchEvent(new CustomEvent('popup', { detail: { body: xhr?.responseText ? xhr.responseText : 'Ein Fehler ist aufgetreten, versuche es bitte später nochmal.' } }));
				}
			}
		};
		xhr.open(param.method, api.url + param.url, true);
		api.addCredentials(xhr);
		if (typeof param.body == 'string')
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		else if (param.body && !(param.body instanceof FormData)) {
			xhr.setRequestHeader('Content-Type', 'application/json');
			param.body = JSON.stringify(param.body);
		}
		if (!param.noProgressBar && api.progressbar)
			setTimeout(function () { if (xhr.readyState != 4) document.dispatchEvent(new CustomEvent('progressbar', { detail: { type: 'open' } })) }, 100);
		xhr.send(param.body);
	}

	static addCredentials(xhr) {
		if (api.user?.id || api.user?.id == 0) {
			var d = new Date();
			var salt = ('' + (d.getTime() + d.getTimezoneOffset() * 60 * 1000) + Math.random()).replace(/[01]\./, '.');
			xhr.setRequestHeader('contactId', api.user.id);
			xhr.setRequestHeader('salt', salt);
			xhr.setRequestHeader('password', Encryption.hash(api.user.password + salt + api.user.id));
			if (api.user?.client?.id)
				xhr.setRequestHeader('clientId', api.user.client.id);
		}
	}
}

class Encryption {
	static jsEncrypt = new JSEncrypt();
	static encPUB(s) {
		var enc = new JSEncrypt();
		enc.setPublicKey('MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAih4+Co9A7+3Hm6aUAHAG0LMjHgQ9ZxT+twg6aNtpg5fJvIApYAufImV5i/Tbv57M/Bmwj4kloONv4WaeUlbx4Vy0SVdPl2fpwTY/DhaS5DIiq3VYWQqjT/MHtMNBqX7tRHHZTBJzKEvKHig0sn2rdEMrZLcBErwbWPZpLz7RWFTbjkmAzxEbTKKGBSpqGO/l4xjZIVSrjKdBOtEdB8+Tw3lwNs2eGrx13rJCPY9VLocErw5CEgqdpgYXWmGOTsfqZjTODmavopTpupI7FMG3UG0Re8YE3Eju9aSsvTyjoBGoe9Gel/dTsZJeckTt5gTPiLr7khzFlZ7MVO75n4PnT4Gsc4YCBMQPlcJ4lv5JdfjwK+JTM/ZnSAezez3TzBz9SuSPck5vpEi6ug1LkUVOmjIXJBkwuGb7eYbRUG/1cj/7boCIZa8cNg2Ired2LKn2DVfurC1LH1U4p/oZGkGP3hd0aA6GD+2PJGZL9qhOSf1Bwuj+QFnHNhil2BV5Zou73KJ1ebCBmG77jkqtk02EMxFM6zPP4ViYmoMcxrSpG12fBWMJDdXaM9aEP0nkd62X7VOi3pHHEOaNnYe1AKV2u/IPApUyWnnrQJXzVag5wHcR1kDDd4G9nzccH1QyxBTJEuEoMYbsGQUyTYsOoSL0SvvOQAf/ukBCRAh90WgTkjsCAwEAAQ==');
		return enc.encrypt(s);
	}
	static hash(s) {
		return sha256.rstr2hex(sha256.rstr_sha256(sha256.str2rstr_utf8(s)))
	}
}

class sha256 {
	static str2rstr_utf8(input) {
		var output = '';
		var i = -1;
		var x, y;

		while (++i < input.length) {
			/* Decode utf-16 surrogate pairs */
			x = input.charCodeAt(i);
			y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
			if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
				x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
				i++;
			}

			/* Encode output as utf-8 */
			if (x <= 0x7F)
				output += String.fromCharCode(x);
			else if (x <= 0x7FF)
				output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F),
					0x80 | (x & 0x3F));
			else if (x <= 0xFFFF)
				output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
					0x80 | ((x >>> 6) & 0x3F),
					0x80 | (x & 0x3F));
			else if (x <= 0x1FFFFF)
				output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
					0x80 | ((x >>> 12) & 0x3F),
					0x80 | ((x >>> 6) & 0x3F),
					0x80 | (x & 0x3F));
		}
		return output;
	}
	static rstr_sha256(s) {
		var output = '';
		var input = sha256.binb_sha256(sha256.rstr2binb(s), s.length * 8);
		for (var i = 0; i < input.length * 32; i += 8)
			output += String.fromCharCode((input[i >> 5] >>> (24 - i % 32)) & 0xFF);
		return output;
	}
	static rstr2hex(input) {
		var hex_tab = '0123456789abcdef';
		var output = '';
		var x;
		for (var i = 0; i < input.length; i++) {
			x = input.charCodeAt(i);
			output += hex_tab.charAt((x >>> 4) & 0x0F)
				+ hex_tab.charAt(x & 0x0F);
		}
		return output;
	}
	static rstr2binb(input) {
		var output = Array(input.length >> 2);
		for (var i = 0; i < output.length; i++)
			output[i] = 0;
		for (var i = 0; i < input.length * 8; i += 8)
			output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
		return output;
	}
	static binb_sha256(m, l) {
		var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534,
			1359893119, -1694144372, 528734635, 1541459225);
		var W = new Array(64);
		var a, b, c, d, e, f, g, h;
		var i, j, T1, T2;
		m[l >> 5] |= 0x80 << (24 - l % 32);
		m[((l + 64 >> 9) << 4) + 15] = l;
		for (i = 0; i < m.length; i += 16) {
			a = HASH[0];
			b = HASH[1];
			c = HASH[2];
			d = HASH[3];
			e = HASH[4];
			f = HASH[5];
			g = HASH[6];
			h = HASH[7];
			for (j = 0; j < 64; j++) {
				if (j < 16)
					W[j] = m[j + i];
				else
					W[j] = sha256.safe_add(sha256.safe_add(sha256.safe_add(sha256.sha256_Gamma1256(W[j - 2]), W[j - 7]), sha256.sha256_Gamma0256(W[j - 15])), W[j - 16]);
				T1 = sha256.safe_add(sha256.safe_add(sha256.safe_add(sha256.safe_add(h, sha256.sha256_Sigma1256(e)), sha256.sha256_Ch(e, f, g)), sha256.sha256_K[j]), W[j]);
				T2 = sha256.safe_add(sha256.sha256_Sigma0256(a), sha256.sha256_Maj(a, b, c));
				h = g;
				g = f;
				f = e;
				e = sha256.safe_add(d, T1);
				d = c;
				c = b;
				b = a;
				a = sha256.safe_add(T1, T2);
			}
			HASH[0] = sha256.safe_add(a, HASH[0]);
			HASH[1] = sha256.safe_add(b, HASH[1]);
			HASH[2] = sha256.safe_add(c, HASH[2]);
			HASH[3] = sha256.safe_add(d, HASH[3]);
			HASH[4] = sha256.safe_add(e, HASH[4]);
			HASH[5] = sha256.safe_add(f, HASH[5]);
			HASH[6] = sha256.safe_add(g, HASH[6]);
			HASH[7] = sha256.safe_add(h, HASH[7]);
		}
		return HASH;
	}
	static sha256_S(X, n) { return (X >>> n) | (X << (32 - n)); }
	static sha256_R(X, n) { return (X >>> n); }
	static sha256_Gamma0256(x) { return (sha256.sha256_S(x, 7) ^ sha256.sha256_S(x, 18) ^ sha256.sha256_R(x, 3)); }
	static sha256_Gamma1256(x) { return (sha256.sha256_S(x, 17) ^ sha256.sha256_S(x, 19) ^ sha256.sha256_R(x, 10)); }
	static sha256_Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
	static sha256_Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
	static sha256_Sigma0256(x) { return (sha256.sha256_S(x, 2) ^ sha256.sha256_S(x, 13) ^ sha256.sha256_S(x, 22)); }
	static sha256_Sigma1256(x) { return (sha256.sha256_S(x, 6) ^ sha256.sha256_S(x, 11) ^ sha256.sha256_S(x, 25)); }
	static sha256_K = new Array(
		1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993,
		-1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987,
		1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
		264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
		-1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585,
		113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
		1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885,
		-1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
		430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
		1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872,
		-1866530822, -1538233109, -1090935817, -965641998
	);
	static safe_add(x, y) {
		var lsw = (x & 0xFFFF) + (y & 0xFFFF);
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return (msw << 16) | (lsw & 0xFFFF);
	}
}