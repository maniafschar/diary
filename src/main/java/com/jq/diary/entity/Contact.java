package com.jq.diary.entity;

import com.jq.diary.util.Utilities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = { @UniqueConstraint(columnNames = { "client_id", "email" }) })
public class Contact extends BaseEntity {
	@ManyToOne
	private Client client;
	@Column(columnDefinition = "TEXT")
	private String note;
	private String name;
	private String email;
	@Column(columnDefinition = "TEXT")
	private String password;
	private String image;
	private String loginLink;
	private Boolean admin = false;
	private Boolean notification = true;
	private Boolean verified = false;
	private Long passwordReset = Long.valueOf(0);

	public Client getClient() {
		return this.client;
	}

	public void setClient(final Client client) {
		this.client = client;
	}

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note.length() > Utilities.MAX_TEXT_LENGTH ? note.substring(Utilities.MAX_TEXT_LENGTH) : note;
	}

	public String getImage() {
		return this.image;
	}

	public void setImage(final String image) {
		this.image = image;
	}

	public String getPassword() {
		return this.password;
	}

	public void setPassword(final String password) {
		this.password = password;
	}

	public String getName() {
		return this.name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	public String getEmail() {
		return this.email;
	}

	public void setEmail(final String email) {
		this.email = email;
	}

	public String getLoginLink() {
		return this.loginLink;
	}

	public void setLoginLink(final String loginLink) {
		this.loginLink = loginLink;
	}

	public Boolean getAdmin() {
		return this.admin;
	}

	public void setAdmin(final Boolean admin) {
		this.admin = admin;
	}

	public Boolean getVerified() {
		return this.verified;
	}

	public void setVerified(final Boolean verified) {
		this.verified = verified;
	}

	public Long getPasswordReset() {
		return this.passwordReset;
	}

	public void setPasswordReset(final Long passwordReset) {
		this.passwordReset = passwordReset;
	}

	public Boolean getNotification() {
		return this.notification;
	}

	public void setNotification(final Boolean notification) {
		this.notification = notification;
	}
}