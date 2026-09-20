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
import com.jq.diary.service.AuthenticationService;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.ContactService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/contact")
public class ContactApi extends ApplicationApi {
	@Autowired
	private AuthenticationService authenticationService;

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
		final Contact user = this.authorizationService.requireContact(contactId, clientId);
		if (contact.getId() == null) {
			contact.getClients().add(this.repository.one(Client.class, clientId));
			this.contactService.save(contact);
			return contact.getId();
		}
		final Contact original = this.repository.one(Contact.class, contact.getId());
		if (Utilities.isEmail(contact.getEmail()))
			original.setEmail(contact.getEmail().toLowerCase().trim());
		if (contact.getName() != null && contact.getName().trim().length() > 0)
			original.setName(contact.getName());
		if (contact.getImage() != null)
			original.setImage(contact.getImage());
		if (contact.getNote() != null)
			original.setNote(contact.getNote());
		this.contactService.save(original);
		if (contact.getClients() != null && original.getClients().stream().anyMatch(e -> e.getId().equals(clientId)) && user.getAdmin() != null && user.getAdmin()) {
			final Client client = this.repository.one(Client.class, clientId);
			client.setImage(contact.getClients().get(0).getImage());
			client.setNote(contact.getClients().get(0).getNote());
			client.setName(contact.getClients().get(0).getName());
			this.repository.save(client);
		} else if (original.getVerified() == null || !original.getVerified())
			this.authenticationService.recoverSendEmail(original.getEmail());
		return original.getId();
	}

	@GetMapping("list")
	public List<Contact> getList(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId) {
		this.authorizationService.requireContact(contactId, clientId);
		return Utilities.filter(this.contactService.list(this.repository.one(Client.class, clientId)));
	}

	@GetMapping("event/{eventId}")
	public List<ContactEvent> getEvent(@PathVariable final BigInteger eventId,
			@RequestHeader final BigInteger contactId) {
		return Utilities.filter(
				this.contactService.listEvent(this.authorizationService.requireEvent(eventId, contactId).getId()));
	}

	@PostMapping("event/{contactId}/{eventId}")
	public BigInteger postEvent(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @PathVariable(name = "contactId") final BigInteger contactIdEvent,
			@PathVariable final BigInteger eventId) {
		final Contact verifiedContact = this.authorizationService.requireContact(contactId, clientId);
		final Contact eventContact = this.authorizationService.requireContact(contactIdEvent, clientId);
		if (verifiedContact.getClients().stream().anyMatch(e -> eventContact.getClients().stream().anyMatch(e2 -> e2.getId().equals(e.getId())))) {
			final ContactEvent contactEvent = new ContactEvent();
			contactEvent.setContact(eventContact);
			contactEvent.setEvent(this.authorizationService.requireEvent(eventId, verifiedContact.getId()));
			this.contactService.save(contactEvent);
			return contactEvent.getId();
		}
		throw new IllegalArgumentException("Client mismatch\ncontactId: " + contactId + "\nclientId: " + clientId
				+ "\nclient of event contact: " + eventContact.getClients().stream().map(e -> e.getId()).toList());
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
