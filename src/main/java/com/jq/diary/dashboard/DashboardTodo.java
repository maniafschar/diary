package com.jq.diary.dashboard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import com.jq.diary.entity.BaseEntity;

@Entity
public class DashboardTodo extends BaseEntity {
	@Column(nullable = false, length = 200)
	private String text;

	@Column(nullable = false)
	private boolean completed;

	public String getText() {
		return this.text;
	}

	public void setText(final String text) {
		this.text = text;
	}

	public boolean isCompleted() {
		return this.completed;
	}

	public void setCompleted(final boolean completed) {
		this.completed = completed;
	}
}
