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
import com.jq.diary.entity.Event;
import com.jq.diary.service.ContactService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/contact")
public class ContactApi extends ApplicationApi {
	@Autowired
	private ContactService contactService;

	@GetMapping("{id}")
	public Contact get(@PathVariable final BigInteger id) {
		return Utilities.filter(this.contactService.one(id));
	}

	@PatchMapping
	public BigInteger patch(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Contact contact) throws EmailException {
		if (contact.getId() == null) {
			contact.setClient(this.verifyContactClient(contactId, clientId).getClient());
			contact.setAdmin(true);
			this.contactService.save(contact);
			return contact.getId();
		}
		final Contact c = this.repository.one(Contact.class, contact.getId());
		if (contact.getEmail() != null)
			c.setEmail(contact.getEmail());
		if (contact.getName() != null)
			c.setName(contact.getName());
		if (contact.getImage() != null)
			c.setImage(contact.getImage());
		if (contact.getNote() != null)
			c.setNote(contact.getNote());
		this.contactService.save(c);
		return c.getId();
	}

	@GetMapping("list")
	public List<Contact> getList(@RequestHeader final BigInteger clientId) {
		return Utilities.filter(this.contactService.list(this.repository.one(Client.class, clientId)));
	}

	@GetMapping("event/{eventId}")
	public List<ContactEvent> getEvent(@PathVariable final BigInteger eventId) {
		return Utilities.filter(this.contactService.listEvent(eventId));
	}

	@GetMapping("client")
	public List<Map<String, Object>> getClient(@RequestHeader final BigInteger contactId) {
		return this.contactService.listClient(contactId);
	}

	@PostMapping("event/{contactId}/{eventId}")
	public BigInteger postEvent(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @PathVariable(name = "contactId") final BigInteger contactIdEvent,
			@PathVariable final BigInteger eventId) {
		final Contact contact = this.repository.one(Contact.class, contactIdEvent);
		if (this.verifyContactClient(contactId, clientId).getClient().getId().equals(contact.getClient().getId())) {
			final ContactEvent contactEvent = new ContactEvent();
			contactEvent.setContact(contact);
			contactEvent.setEvent(this.repository.one(Event.class, eventId));
			this.contactService.save(contactEvent);
			return contactEvent.getId();
		}
		throw new IllegalArgumentException("Client mismatch\ncontactId: " + contactId + "\nclientId: " + clientId
				+ "\nclient of event contact: " + contact.getClient().getId());
	}

	@DeleteMapping("event/{contactEventId}")
	public void deleteEvent(@PathVariable final BigInteger contactEventId) {
		this.contactService.delete(this.repository.one(ContactEvent.class, contactEventId));
	}
}