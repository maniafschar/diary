package com.jq.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;

@Entity
public class ChatSummary extends BaseEntity {
	@OneToOne
	private Contact contact;

	@Column(name = "summary_text", columnDefinition = "TEXT")
	private String text;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getText() {
		return this.text;
	}

	public void setText(final String text) {
		this.text = text;
	}
}