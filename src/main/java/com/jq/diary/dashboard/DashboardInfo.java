package com.jq.diary.dashboard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import com.jq.diary.entity.BaseEntity;

/** Single row holding the free text of the dashboard. */
@Entity
public class DashboardInfo extends BaseEntity {
	@Column(nullable = false, length = 1_000_000)
	private String content = "";

	public String getContent() {
		return this.content;
	}

	public void setContent(final String content) {
		this.content = content;
	}
}
