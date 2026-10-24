package com.jq.diary.dashboard;

import java.math.BigInteger;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/** JPA access to the "dashboard" database. */
@Repository
@Transactional(DatabaseConfiguration.DASHBOARD_TRANSACTION_MANAGER)
public class DashboardRepository {
	@PersistenceContext(unitName = DatabaseConfiguration.DASHBOARD_UNIT)
	private EntityManager em;

	public List<Link> links() {
		return this.em.createQuery("from DashboardLink order by title, id", Link.class).getResultList();
	}

	public Link addLink(final String title, final String url, final String remark) {
		final Link link = new Link();
		link.setTitle(title);
		link.setUrl(url);
		link.setRemark(remark);
		link.setCreatedAt(now());
		this.em.persist(link);
		return link;
	}

	public boolean deleteLink(final BigInteger id) {
		return this.delete(Link.class, id);
	}

	public List<Todo> todos() {
		return this.em.createQuery("from DashboardTodo order by id", Todo.class).getResultList();
	}

	public Todo addTodo(final String text) {
		final Todo todo = new Todo();
		todo.setText(text);
		todo.setCreatedAt(now());
		this.em.persist(todo);
		return todo;
	}

	public boolean setTodoCompleted(final BigInteger id, final boolean completed) {
		final Todo todo = this.em.find(Todo.class, id);
		if (todo == null)
			return false;
		todo.setCompleted(completed);
		todo.setModifiedAt(now());
		return true;
	}

	public boolean deleteTodo(final BigInteger id) {
		return this.delete(Todo.class, id);
	}

	public String info() {
		final Info info = this.infoEntity();
		return info == null ? "" : info.getContent();
	}

	public void saveInfo(final String content) {
		final Info info = this.infoEntity();
		if (info == null) {
			final Info created = new Info();
			created.setCreatedAt(now());
			created.setContent(content);
			this.em.persist(created);
		} else {
			info.setContent(content);
			info.setModifiedAt(now());
		}
	}

	private Info infoEntity() {
		final List<Info> result = this.em.createQuery("from DashboardInfo order by id", Info.class)
				.setMaxResults(1).getResultList();
		return result.isEmpty() ? null : result.get(0);
	}

	private <T> boolean delete(final Class<T> type, final BigInteger id) {
		final T entity = this.em.find(type, id);
		if (entity == null)
			return false;
		this.em.remove(entity);
		return true;
	}

	private static Timestamp now() {
		return new Timestamp(Instant.now().toEpochMilli());
	}
}
