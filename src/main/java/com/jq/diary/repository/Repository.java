package com.jq.diary.repository;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.regex.Pattern;

import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.jq.diary.entity.BaseEntity;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;

@org.springframework.stereotype.Repository
@Transactional(propagation = Propagation.REQUIRES_NEW)
@Component
public class Repository {
	@PersistenceContext
	private EntityManager em;

	@Autowired
	private Listeners listeners;

	public <T extends BaseEntity> List<T> list(final String hql, final Class<T> clazz) {
		return this.em.createQuery(hql, clazz).getResultList();
	}

	public List<?> list(final String hql) {
		return this.em.createQuery(hql).getResultList();
	}

	public <T extends BaseEntity> T one(final Class<T> clazz, final BigInteger id) {
		final T entity = this.em.find(clazz, id);
		if (entity != null)
			entity.historize();
		return entity;
	}

	public void save(final BaseEntity entity) throws IllegalArgumentException {
		try {
			Attachment.save(entity);
			if (entity.getId() == null) {
				if (entity.getCreatedAt() == null)
					entity.setCreatedAt(new Timestamp(Instant.now().toEpochMilli()));
				this.em.persist(entity);
			} else {
				entity.setModifiedAt(new Timestamp(Instant.now().toEpochMilli()));
				this.em.merge(entity);
			}
			this.em.flush();
		} catch (final PersistenceException ex) {
			throw new RuntimeException(ex);
		}
	}

	public void delete(final BaseEntity entity) throws IllegalArgumentException {
		try {
			this.em.remove(this.em.contains(entity) ? entity : this.em.merge(entity));
			Attachment.delete(entity);
		} catch (final PersistenceException ex) {
			throw new RuntimeException(ex);
		}
	}

	public void executeUpdate(final String hql, final Object... params) {
		final jakarta.persistence.Query query = this.em.createQuery(hql);
		if (params != null) {
			for (int i = 0; i < params.length; i++)
				query.setParameter(i + 1, params[i]);
		}
		query.executeUpdate();
	}

	public static class Attachment {
		private final static String SEPARATOR = "\u0015";
		private final static String PATH = "attachments/";
		private final static String PUBLIC = "PUBLIC/";
		private final static Pattern RESOLVABLE_COLUMNS = Pattern.compile(".*(image).*");
		private final static Pattern FILE_ID = Pattern.compile("^\\d0{4,10}/\\d{1,10}(\\.[a-z1-9]{2,5})?$");
		private final static long MAX_PER_DIRECTORY = 10000;
		static {
			final Path path = Paths.get(PATH + PUBLIC);
			try {
				if (!Files.exists(path.getParent()))
					Files.createDirectory(path.getParent());
				if (!Files.exists(path))
					Files.createDirectory(path);
			} catch (final IOException e) {
				throw new RuntimeException(e);
			}
		}

		public static String createImage(final String type, final byte[] data) {
			return type + SEPARATOR + Base64.getEncoder().encodeToString(data);
		}

		private static void delete(final BaseEntity entity) {
			final Field[] fields = entity.getClass().getDeclaredFields();
			for (final Field field : fields) {
				if (RESOLVABLE_COLUMNS.matcher(field.getName()).matches()) {
					try {
						field.setAccessible(true);
						final String value = "" + field.get(entity);
						if (FILE_ID.matcher(value).matches()) {
							final File f = new File(PATH + (value.contains(".") ? PUBLIC : "") + value);
							if (f.exists()) {
								final Path path = Paths.get(PATH + "DELETED/" + value);
								if (!Files.exists(path.getParent()))
									Files.createDirectories(path.getParent());
								Files.move(Paths.get(f.toURI()), path);
							}
						}
					} catch (final Exception e) {
						throw new RuntimeException("Failed on " + field.getName(), e);
					}
				}
			}
		}

		public static void save(final BaseEntity entity) {
			final Field[] fields = entity.getClass().getDeclaredFields();
			for (final Field field : fields) {
				if (RESOLVABLE_COLUMNS.matcher(field.getName()).matches()
						&& (entity.getId() == null || entity.old(field.getName()) != null)) {
					try {
						field.setAccessible(true);
						field.set(entity,
								save(field.getName().contains("image"), (String) field.get(entity),
										(String) entity.old(field.getName())));
					} catch (final Exception e) {
						throw new RuntimeException("Failed on " + field.getName(), e);
					}
				}
			}
		}

		private static long max(final String dir, long max) {
			final File f = new File(dir.replace('/', File.separatorChar));
			if (f.exists() && !f.isFile()) {
				final String[] s = f.list();
				final Pattern number = Pattern.compile("^\\d+(\\.[a-zA-Z0-9]{2,5})?$");
				long t;
				for (int i = 0; i < s.length; i++) {
					if (number.matcher(s[i]).matches()) {
						try {
							t = Long.parseLong(s[i].indexOf('.') > -1 ? s[i].substring(0, s[i].indexOf('.')) : s[i]);
							if (max < t)
								max = t;
						} catch (final NumberFormatException ex) {
							throw new NumberFormatException("Failed to parse attachment " + dir + s[i]);
						}
					}
				}
			}
			return max;
		}

		private static final long nextId(final String dir) {
			long max = max(dir, -1);
			if (max > -1)
				max = max(dir + max, max - MAX_PER_DIRECTORY);
			return max + 1;
		}

		private static final String id2dir(final long id) {
			// 30089 > 40000/30089
			return (((int) (id / MAX_PER_DIRECTORY) + 1) * MAX_PER_DIRECTORY) + "/" + id;
		}

		private static synchronized String save(final boolean publicDir, final String value, final String old)
				throws IOException {
			if (value == null) {
				if (old != null && FILE_ID.matcher(old).matches())
					new File(PATH + (old.contains(".") ? PUBLIC : "") + old).delete();
				return value;
			}
			if (FILE_ID.matcher(value).matches()
					&& new File(PATH + (value.contains(".") ? PUBLIC : "") + value).exists())
				return value;
			final String id;
			// value = "jpg" + SEPARATOR + "base64data";
			// value = "some text";
			if (publicDir) {
				if (value.contains(SEPARATOR) && value.indexOf(SEPARATOR) == value.lastIndexOf(SEPARATOR)) {
					final String[] s = value.split(SEPARATOR);
					final byte[] data = Base64.getDecoder().decode(s[1]);
					if (old != null) {
						final Path path = Paths.get(PATH + PUBLIC + old);
						if (Files.exists(path)) {
							if (Arrays.equals(IOUtils.toByteArray(new FileInputStream(path.toFile())), data))
								return old;
							new File(PATH + PUBLIC + old).delete();
						}
					}
					// new image, we need a new id because of browser caching
					id = id2dir(nextId(PATH + PUBLIC)) + '.' + s[0].toLowerCase();
					final Path path = Paths.get(PATH + PUBLIC + id);
					if (!Files.exists(path.getParent()))
						Files.createDirectory(path.getParent());
					IOUtils.write(data, new FileOutputStream(path.toFile()));
				} else
					throw new IllegalArgumentException("IMAGE_FORMAT_EXCEPTION "
							+ (value.indexOf(SEPARATOR) > -1 ? "duplicate" : "missing") + " separeator: "
							+ value.substring(0, Math.min(50, value.length())));
			} else {
				if (old != null && FILE_ID.matcher(old).matches()) {
					// overwrite old value, which is stored in a file
					new File(PATH + old).delete();
					id = old;
				} else {
					id = id2dir(nextId(PATH));
					final Path path = Paths.get(PATH + id);
					if (!Files.exists(path.getParent()))
						Files.createDirectory(path.getParent());
				}
				IOUtils.write(value.getBytes(StandardCharsets.UTF_8), new FileOutputStream(PATH + id));
			}
			return id;
		}
	}
}