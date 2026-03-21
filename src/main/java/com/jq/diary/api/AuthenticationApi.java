package com.jq.diary.api;

import java.math.BigInteger;

import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.service.AuthenticationService;
import com.jq.diary.util.Encryption;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/authentication")
public class AuthenticationApi extends ApplicationApi {
	@Autowired
	private AuthenticationService authenticationService;

	@GetMapping("login")
	public Contact getLogin(final String email, @RequestHeader final String password,
			@RequestHeader final String salt) {
		return Utilities.filter(
				this.authenticationService.login(Encryption.decryptBrowser(email), password, salt));
	}

	@GetMapping("token")
	public Contact getToken(final String token, final String publicKey) {
		return this.authenticationService.token2User(publicKey, Encryption.decryptBrowser(token));
	}

	@DeleteMapping("token")
	public void deleteToken(final String token) {
		this.authenticationService.tokenDelete(Encryption.decryptBrowser(token));
	}

	@PutMapping("token")
	public String putToken(@RequestHeader final BigInteger contactId, final String publicKey) {
		return this.authenticationService.tokenRefresh(this.repository.one(Contact.class, contactId), publicKey);
	}

	@PostMapping("create")
	public void postCreate(@RequestBody final Client client) {
		this.authenticationService.createClient(client);
	}

	@PostMapping("verify")
	public void postVerify(final String token, final String password) {
		this.authenticationService.recoverVerifyEmail(Encryption.decryptBrowser(token),
				Encryption.decryptBrowser(password));
	}

	@GetMapping("verify")
	public String getVerify(final String email) throws EmailException {
		return this.authenticationService.recoverSendEmail(Encryption.decryptBrowser(email));
	}
}