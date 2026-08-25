package com.jq.diary.api;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.ContactService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/contact")
public class ContactApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private ContactService contactService;

	@GetMapping("{id}")
	public Contact get(@PathVariable final BigInteger id, @RequestHeader final BigInteger clientId) {
		return Utilities.filter(this.authorizationService.requireContact(id, clientId));
	}

	@PatchMapping
	public BigInteger patch(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Contact contact) throws EmailException {
		final Contact original = this.authorizationService.requireContact(contactId, clientId);
		if (contact.getId() == null) {
			contact.setClient(original.getClient());
			this.contactService.save(contact);
			return contact.getId();
		}
		if (Utilities.isEmail(contact.getEmail()))
			original.setEmail(contact.getEmail());
		if (contact.getName() != null && contact.getName().trim().length() > 0)
			original.setName(contact.getName());
		if (contact.getImage() != null)
			original.setImage(contact.getImage());
		if (contact.getNote() != null)
			original.setNote(contact.getNote());
		this.contactService.save(original);
		if (contact.getClient() != null && original.getClient().getId().equals(clientId)) {
			final Client client = original.getClient();
			client.setImage(contact.getClient().getImage());
			client.setNote(contact.getClient().getNote());
			client.setName(contact.getClient().getName());
			this.repository.save(client);
		}
		return original.getId();
	}

	@GetMapping("list")
	public List<Contact> getList(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId) {
		return Utilities.filter(
				this.contactService.list(this.authorizationService.requireContact(contactId, clientId).getClient()));
	}

	@GetMapping("event/{eventId}")
	public List<ContactEvent> getEvent(@PathVariable final BigInteger eventId,
			@RequestHeader final BigInteger contactId) {
		return Utilities.filter(
				this.contactService.listEvent(this.authorizationService.requireEvent(eventId, contactId).getId()));
	}

	@GetMapping("client")
	public List<Map<String, Object>> getClient(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		return this.contactService.listClient(this.authorizationService.requireContact(contactId, clientId));
	}

	@PostMapping("event/{contactId}/{eventId}")
	public BigInteger postEvent(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @PathVariable(name = "contactId") final BigInteger contactIdEvent,
			@PathVariable final BigInteger eventId) {
		final Contact contact = this.authorizationService.requireContact(contactIdEvent, clientId);
		final Contact verifiedContact = this.authorizationService.requireContact(contactId, clientId);
		if (verifiedContact.getClient().getId().equals(contact.getClient().getId())) {
			final ContactEvent contactEvent = new ContactEvent();
			contactEvent.setContact(contact);
			contactEvent.setEvent(this.authorizationService.requireEvent(eventId, verifiedContact.getId()));
			this.contactService.save(contactEvent);
			return contactEvent.getId();
		}
		throw new IllegalArgumentException("Client mismatch\ncontactId: " + contactId + "\nclientId: " + clientId
				+ "\nclient of event contact: " + contact.getClient().getId());
	}

	@DeleteMapping("event/{contactEventId}")
	public void deleteEvent(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @PathVariable final BigInteger contactEventId) {
		final ContactEvent contactEvent = this.repository.one(ContactEvent.class, contactEventId);
		this.authorizationService.requireEvent(contactEvent.getEvent().getId(),
				this.authorizationService.requireContact(contactId, clientId).getId());
		this.contactService.delete(contactEvent);
	}
}
