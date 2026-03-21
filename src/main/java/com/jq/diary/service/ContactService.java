package com.jq.diary.service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
		return this.repository.list("from Contact where client.id=" + client.getId() + " order by name", Contact.class);
	}

	public List<ContactEvent> listEvent(final BigInteger eventId) {
		return this.repository.list("from ContactEvent where event.id=" + eventId, ContactEvent.class);
	}

	public List<Map<String, Object>> listClient(final BigInteger contactId) {
		final Contact contact = this.repository.one(Contact.class, contactId);
		final List<Contact> list = this.repository.list("from Contact where email='" + contact.getEmail() + "'",
				Contact.class);
		final List<Map<String, Object>> result = new ArrayList<>();
		final List<Client> clients = this.repository.list(
				"from Client where id in ("
						+ list.stream().map(e -> "" + e.getClient().getId()).collect(Collectors.joining(",")) + ")",
				Client.class);
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