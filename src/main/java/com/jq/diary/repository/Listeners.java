package com.jq.diary.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.listener.AbstractRepositoryListener;
import com.jq.diary.repository.listener.ContactListener;
import com.jq.diary.repository.listener.TicketListener;

@Component
class Listeners {
	@Autowired
	private ApplicationContext applicationContext;

	private static final AbstractRepositoryListener<?> LISTENER = new AbstractRepositoryListener<>() {
	};

	@SuppressWarnings("unchecked")
	private <T extends BaseEntity> AbstractRepositoryListener<T> entity2listener(final T entity) {
		if (entity instanceof Contact)
			return (AbstractRepositoryListener<T>) this.applicationContext.getBean(ContactListener.class);
		if (entity instanceof Ticket)
			return (AbstractRepositoryListener<T>) this.applicationContext.getBean(TicketListener.class);
		return (AbstractRepositoryListener<T>) LISTENER;
	}

	<T extends BaseEntity> void prePersist(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).prePersist(entity);
	}

	<T extends BaseEntity> void postPersist(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).postPersist(entity);
	}

	<T extends BaseEntity> void preUpdate(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).preUpdate(entity);
	}

	<T extends BaseEntity> void postUpdate(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).postUpdate(entity);
	}

	<T extends BaseEntity> void preRemove(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).preRemove(entity);
	}

	<T extends BaseEntity> void postRemove(final T entity) throws IllegalArgumentException {
		this.entity2listener(entity).postRemove(entity);
	}
}