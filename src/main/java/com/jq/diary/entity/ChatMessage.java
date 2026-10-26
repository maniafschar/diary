package com.jq.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;

@Entity
public class ChatMessage extends BaseEntity {
	@ManyToOne
	private Contact contact;

	@Column(columnDefinition = "TEXT")
	private String note;

	@Column(length = 16)
	private String role;

	@Column(length = 128)
	private String summaryCategories;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note;
	}

	public String getRole() {
		return this.role;
	}

	public void setRole(final String role) {
		this.role = role;
	}

	public String getSummaryCategories() {
		return this.summaryCategories;
	}

	public void setSummaryCategories(final String summaryCategories) {
		this.summaryCategories = summaryCategories;
	}
}
