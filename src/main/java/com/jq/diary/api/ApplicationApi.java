package com.jq.diary.api;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.AdminService;

@RestController
@RequestMapping("api")
public class ApplicationApi {
	@Autowired
	private AdminService adminService;

	@Autowired
	protected Repository repository;

	@PostMapping("ticket")
	public void postTicket(@RequestBody final Ticket ticket) {
		this.adminService.createTicket(ticket);
	}

	protected Contact verifyContactClient(final BigInteger contactId, final BigInteger clientId) {
		final Contact contact = this.repository.one(Contact.class, contactId);
		if (contact.getClient().getId().equals(clientId))
			return contact;
		final List<Contact> list = this.repository.list(
				"from Contact where email='" + contact.getEmail() + "' and id<>" + contact.getId(), Contact.class);
		for (final Contact c : list) {
			if (c.getClient().getId().equals(clientId))
				return c;
		}
		throw new IllegalArgumentException(
				"Access to client " + clientId + " for user " + contactId + " " + contact.getName() + " rejected");
	}
}