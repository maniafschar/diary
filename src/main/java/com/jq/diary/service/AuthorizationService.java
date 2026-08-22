package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.repository.Repository;

@Service
public class AuthorizationService {
	@Autowired
	private Repository repository;

	public Event requireEvent(final BigInteger eventId, final BigInteger contactId) {
		final Event event = this.repository.one(Event.class, eventId);
		if (event == null || event.getContact() == null)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		final Contact contact = this.repository.one(Contact.class, contactId);
		if (contact == null || !contact.getClient().getId().equals(event.getContact().getClient().getId()))
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		return event;
	}

	public Contact requireContact(final BigInteger contactId, final BigInteger clientId) {
		final Contact contact = this.repository.one(Contact.class, contactId);
		if (contact == null)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		if (contact.getClient().getId().equals(clientId))
			return contact;
		final List<Contact> list = this.repository.list(
				"from Contact where email=?1 and id<>?2", Contact.class, contact.getEmail(), contact.getId());
		for (final Contact c : list) {
			if (c.getClient().getId().equals(clientId))
				return c;
		}
		throw new ResponseStatusException(HttpStatus.NOT_FOUND);
	}
}