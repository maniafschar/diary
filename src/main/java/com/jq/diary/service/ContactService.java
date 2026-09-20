package com.jq.diary.service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.repository.Repository;

@Service
public class ContactService {
	@Autowired
	private Repository repository;

	public List<Contact> list(final Client client) {
		return this.repository.list("from Contact as contact inner join contact.clients as clients where clients.id=?1 order by name", Contact.class, client.getId());
	}

	public List<ContactEvent> listEvent(final BigInteger eventId) {
		return this.repository.list("from ContactEvent where event.id=?1", ContactEvent.class, eventId);
	}

	public Contact one(final BigInteger id) {
		return this.repository.one(Contact.class, id);
	}

	public void delete(final ContactEvent contactEvent) {
		this.repository.delete(contactEvent);
	}

	public void save(final ContactEvent contactEvent) {
		this.repository.save(contactEvent);
	}

	public void save(final Contact contact) {
		this.repository.save(contact);
	}
}
