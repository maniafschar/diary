package com.jq.diary.repository.listener;

import org.springframework.beans.factory.annotation.Autowired;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.repository.Repository;

public abstract class AbstractRepositoryListener<T extends BaseEntity> {
	@Autowired
	protected Repository repository;

	public void prePersist(final T entity) throws IllegalArgumentException {
	}

	public void postPersist(final T entity) throws IllegalArgumentException {
	}

	public void preUpdate(final T entity) throws IllegalArgumentException {
	}

	public void postUpdate(final T entity) throws IllegalArgumentException {
	}

	public void preRemove(final T entity) throws IllegalArgumentException {
	}

	public void postRemove(final T entity) throws IllegalArgumentException {
	}
}