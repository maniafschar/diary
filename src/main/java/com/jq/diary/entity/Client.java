package com.jq.diary.entity;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;

@Entity
public class Client extends BaseEntity {
	@Column(columnDefinition = "TEXT")
	private String note;
	private String image;
	@OneToMany
	@JsonBackReference
	private List<Contact> contacts;

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note.length() > 1000 ? note.substring(0, 1000) : note;
	}

	public String getImage() {
		return this.image;
	}

	public void setImage(final String image) {
		this.image = image;
	}

	public List<Contact> getContacts() {
		return this.contacts;
	}

	public void setContacts(final List<Contact> contacts) {
		this.contacts = contacts;
	}
}