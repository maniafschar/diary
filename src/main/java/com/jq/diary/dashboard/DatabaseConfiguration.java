package com.jq.diary.dashboard;

import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import com.zaxxer.hikari.HikariDataSource;

import jakarta.persistence.EntityManagerFactory;

/**
 * Two persistence units: the existing main database (primary, same settings as
 * before) and the separate "dashboard" database. Spring Boot's
 * auto-configuration only handles a single one, so both are declared here.
 */
@Configuration
public class DatabaseConfiguration {
	public static final String DASHBOARD_UNIT = "dashboardEntityManagerFactory";
	public static final String DASHBOARD_TRANSACTION_MANAGER = "dashboardTransactionManager";

	@Bean
	@Primary
	@ConfigurationProperties("spring.datasource")
	public DataSourceProperties dataSourceProperties() {
		return new DataSourceProperties();
	}

	@Bean
	@Primary
	@ConfigurationProperties("spring.datasource.hikari")
	public DataSource dataSource(final DataSourceProperties properties) {
		return properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
	}

	@Bean
	@Primary
	public LocalContainerEntityManagerFactoryBean entityManagerFactory(final DataSource dataSource) {
		return this.factory("main", dataSource, "com.jq.diary.entity", this.hibernateProperties());
	}

	@Bean
	@Primary
	public PlatformTransactionManager transactionManager(final EntityManagerFactory entityManagerFactory) {
		return new JpaTransactionManager(entityManagerFactory);
	}

	@Bean
	public DataSource dashboardDataSource(@Value("${app.dashboard.url}") final String url,
			@Value("${spring.datasource.username}") final String user,
			@Value("${spring.datasource.password}") final String password) {
		final HikariDataSource dataSource = new HikariDataSource();
		dataSource.setJdbcUrl(url);
		dataSource.setUsername(user);
		dataSource.setPassword(password);
		dataSource.setMaximumPoolSize(5);
		dataSource.setMinimumIdle(0);
		dataSource.setMaxLifetime(60000);
		dataSource.setIdleTimeout(30000);
		if (url.startsWith("jdbc:mysql"))
			dataSource.setConnectionInitSql("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
		return dataSource;
	}

	@Bean(name = DASHBOARD_UNIT)
	public LocalContainerEntityManagerFactoryBean dashboardEntityManagerFactory(
			@Qualifier("dashboardDataSource") final DataSource dashboardDataSource) {
		final Map<String, Object> properties = this.hibernateProperties();
		// the dashboard schema is small and owned by this unit, so it creates itself
		properties.put("hibernate.hbm2ddl.auto", "update");
		return this.factory("dashboard", dashboardDataSource, "com.jq.diary.dashboard", properties);
	}

	@Bean(name = DASHBOARD_TRANSACTION_MANAGER)
	public PlatformTransactionManager dashboardTransactionManager(
			@Qualifier(DASHBOARD_UNIT) final EntityManagerFactory factory) {
		return new JpaTransactionManager(factory);
	}

	private LocalContainerEntityManagerFactoryBean factory(final String unit, final DataSource dataSource,
			final String packageToScan, final Map<String, Object> properties) {
		final LocalContainerEntityManagerFactoryBean bean = new LocalContainerEntityManagerFactoryBean();
		bean.setPersistenceUnitName(unit);
		bean.setDataSource(dataSource);
		bean.setPackagesToScan(packageToScan);
		bean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
		bean.setJpaPropertyMap(properties);
		return bean;
	}

	// same naming and time zone as Spring Boot's setup used so far
	private Map<String, Object> hibernateProperties() {
		final Map<String, Object> properties = new HashMap<>();
		properties.put("hibernate.physical_naming_strategy", CamelCaseToUnderscoresNamingStrategy.class.getName());
		properties.put("hibernate.implicit_naming_strategy",
				"org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy");
		properties.put("hibernate.jdbc.time_zone", "UTC");
		return properties;
	}
}
