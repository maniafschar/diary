package com.jq.diary.dashboard;

import com.jq.diary.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/** Single row holding the free text of the dashboard. */
@Entity
public class Info extends BaseEntity {
	@Column(nullable = false, length = 1_000_000)
	private String content = "";

	public String getContent() {
		return this.content;
	}

	public void setContent(final String content) {
		this.content = content;
	}
}
