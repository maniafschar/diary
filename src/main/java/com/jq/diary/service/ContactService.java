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
		return this.repository.list("from Contact where client.id=?1 order by name", Contact.class, client.getId());
	}

	public List<ContactEvent> listEvent(final BigInteger eventId) {
		return this.repository.list("from ContactEvent where event.id=?1", ContactEvent.class, eventId);
	}

	public List<Map<String, Object>> listClient(final Contact contact) {
		final List<Contact> list = this.repository.list("from Contact where email=?1", Contact.class,
				contact.getEmail());
		final List<Map<String, Object>> result = new ArrayList<>();
		final List<Client> clients = this.repository.list("from Client where id in ?1", Client.class,
				list.stream().map(e -> "" + e.getClient().getId()).toArray());
		for (final Client client : clients) {
			final Map<String, Object> entry = new HashMap<>();
			entry.put("id", client.getId());
			entry.put("name", client.getName());
			entry.put("note", client.getNote());
			entry.put("image", client.getImage());
			entry.put("contactId",
					list.stream().filter(e -> e.getClient().getId().equals(client.getId())).findFirst().get().getId());
			result.add(entry);
		}
		return result;
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