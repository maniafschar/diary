package com.jq.diary.api;

import java.math.BigInteger;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

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

@RestController
@RequestMapping("api/chat")
public class ChatApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private ChatService chatService;

	@GetMapping("messages")
	public List<MessageResponse> getMessages(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		final Contact contact = this.authorizationService.requireContact(contactId, clientId);
		return this.chatService.list(contact).stream().map(MessageResponse::new).toList();
	}

	@PostMapping("messages")
	public Map<String, String> postMessage(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @RequestBody final MessageRequest request) {
		final Contact contact = this.authorizationService.requireContact(contactId, clientId);
		return Map.of("answer", this.chatService.send(contact, request == null ? null : request.text()));
	}

	public record MessageRequest(String text) {
	}

	public record MessageResponse(BigInteger id, String role, String text, Timestamp createdAt) {
		private MessageResponse(final ChatMessage message) {
			this(message.getId(), message.getRole(), message.getNote(), message.getCreatedAt());
		}
	}
}