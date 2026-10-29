package com.jq.diary.api;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.Contact;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.ChatService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/chat")
public class ChatApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private ChatService chatService;

	@GetMapping("messages")
	public List<ChatMessage> getMessages(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		final Contact contact = this.authorizationService.requireContact(contactId, clientId);
		return Utilities.filter(this.chatService.list(contact));
	}

	@PostMapping("messages")
	public ChatMessage postMessage(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @RequestBody final String text) {
		return Utilities
				.filter(this.chatService.send(this.authorizationService.requireContact(contactId, clientId), text));
	}
}