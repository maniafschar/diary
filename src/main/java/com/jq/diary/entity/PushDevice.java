package com.jq.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = "token"))
public class PushDevice extends BaseEntity {
	@ManyToOne(optional = false)
	private Contact contact;

	@Column(nullable = false, length = 128)
	private String token;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getToken() {
		return this.token;
	}

	public void setToken(final String token) {
		this.token = token;
	}
}