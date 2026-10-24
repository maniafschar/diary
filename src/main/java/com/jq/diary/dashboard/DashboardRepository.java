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

	public List<DashboardLink> links() {
		return this.em.createQuery("from DashboardLink order by title, id", DashboardLink.class).getResultList();
	}

	public DashboardLink addLink(final String title, final String url, final String remark) {
		final DashboardLink link = new DashboardLink();
		link.setTitle(title);
		link.setUrl(url);
		link.setRemark(remark);
		link.setCreatedAt(now());
		this.em.persist(link);
		return link;
	}

	public boolean deleteLink(final BigInteger id) {
		return this.delete(DashboardLink.class, id);
	}

	public List<DashboardTodo> todos() {
		return this.em.createQuery("from DashboardTodo order by id", DashboardTodo.class).getResultList();
	}

	public DashboardTodo addTodo(final String text) {
		final DashboardTodo todo = new DashboardTodo();
		todo.setText(text);
		todo.setCreatedAt(now());
		this.em.persist(todo);
		return todo;
	}

	public boolean setTodoCompleted(final BigInteger id, final boolean completed) {
		final DashboardTodo todo = this.em.find(DashboardTodo.class, id);
		if (todo == null)
			return false;
		todo.setCompleted(completed);
		todo.setModifiedAt(now());
		return true;
	}

	public boolean deleteTodo(final BigInteger id) {
		return this.delete(DashboardTodo.class, id);
	}

	public String info() {
		final DashboardInfo info = this.infoEntity();
		return info == null ? "" : info.getContent();
	}

	public void saveInfo(final String content) {
		final DashboardInfo info = this.infoEntity();
		if (info == null) {
			final DashboardInfo created = new DashboardInfo();
			created.setCreatedAt(now());
			created.setContent(content);
			this.em.persist(created);
		} else {
			info.setContent(content);
			info.setModifiedAt(now());
		}
	}

	private DashboardInfo infoEntity() {
		final List<DashboardInfo> result = this.em.createQuery("from DashboardInfo order by id", DashboardInfo.class)
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
