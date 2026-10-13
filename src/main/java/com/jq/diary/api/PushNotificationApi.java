package com.jq.diary.api;

import java.math.BigInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Contact;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.PushNotificationService;

@RestController
@RequestMapping("api/push")
public class PushNotificationApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private PushNotificationService pushNotificationService;

	@PostMapping("register")
	public void register(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final DeviceToken request) {
		final Contact contact = this.authorizationService.requireContact(contactId, clientId);
		this.pushNotificationService.register(contact, request.token());
	}

	@PostMapping("unregister")
	public void unregister(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final DeviceToken request) {
		this.authorizationService.requireContact(contactId, clientId);
		this.pushNotificationService.unregister(contactId, request.token());
	}

	public record DeviceToken(String token) {
	}
}