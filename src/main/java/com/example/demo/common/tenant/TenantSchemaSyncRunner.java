package com.example.demo.common.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * On every application startup, re-provisions all known tenant schemas.
 *
 * This ensures tenant schemas stay in sync with the current entity definitions,
 * even when new entities are added after a schema was first provisioned.
 * SchemaProvisioningService uses ddl-auto=update, so this is safe and idempotent.
 *
 * Runs after DataSeeder (@Order(1)) so newly-seeded head offices are also covered.
 */
@Slf4j
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.tenants.schema-sync.enabled",havingValue="true",matchIfMissing=true)
@Order(2)
@RequiredArgsConstructor
public class TenantSchemaSyncRunner implements CommandLineRunner {

    private final DataSource dataSource;
    private final SchemaProvisioningService schemaProvisioningService;

    private final jakarta.persistence.EntityManagerFactory entityManagerFactory;
    @org.springframework.beans.factory.annotation.Value("${app.tenants.schema-sync.force:false}")
    private boolean force;

    private String modelFingerprint() {
        try {
            var digest=java.security.MessageDigest.getInstance("SHA-256");
            digest.update(org.hibernate.Version.getVersionString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var types=new java.util.TreeMap<String,Class<?>>();
            for(var type:entityManagerFactory.getMetamodel().getManagedTypes())
                for(Class<?> c=type.getJavaType();c!=null && c!=Object.class;c=c.getSuperclass())types.put(c.getName(),c);
            types.put(SchemaProvisioningService.class.getName(),SchemaProvisioningService.class);
            for(var entry:types.entrySet()) {
                digest.update(entry.getKey().getBytes(java.nio.charset.StandardCharsets.UTF_8));
                try(var in=entry.getValue().getResourceAsStream("/"+entry.getKey().replace('.','/')+".class")) {
                    if(in==null)throw new IllegalStateException("Missing model bytecode: "+entry.getKey());
                    digest.update(in.readAllBytes());
                }
            }
            return java.util.HexFormat.of().formatHex(digest.digest());
        } catch(Exception e) {throw new IllegalStateException("Cannot fingerprint tenant model",e);}
    }

    @Override
    public void run(String... args) {
        log.info("[TenantSync] Syncing all tenant schemas with current entity definitions...");
        // Also support deployments without a Flyway runner (the SQL migration is
        // supplied for managed deployments). Never stamp a partially synced schema.
        try(var conn=dataSource.getConnection();var statement=conn.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS public.tenant_schema_versions (schema_name varchar(255) PRIMARY KEY,model_hash varchar(64) NOT NULL,synced_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)");
        } catch(java.sql.SQLException e) {throw new IllegalStateException("Cannot initialize tenant schema versions",e);}
        String fingerprint=modelFingerprint();
        for (String schema : loadHeadOfficeSchemas()) {
            try {
                if(!force && isCurrent(schema,fingerprint)) {
                    log.info("[TenantSync] Schema '{}' already current.",schema);
                    continue;
                }
                schemaProvisioningService.provisionSchema(schema);
                try(var conn=dataSource.getConnection();var ps=conn.prepareStatement(
                    "INSERT INTO public.tenant_schema_versions(schema_name,model_hash,synced_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(schema_name) DO UPDATE SET model_hash=excluded.model_hash,synced_at=excluded.synced_at")) {
                    ps.setString(1,schema);ps.setString(2,fingerprint);ps.executeUpdate();
                }
                log.info("[TenantSync] Schema '{}' synced.", schema);
            } catch (Exception e) {
                throw new IllegalStateException("Tenant schema synchronization failed: "+schema,e);
            }
        }
        log.info("[TenantSync] Done.");
    }

    private boolean isCurrent(String schema,String fingerprint) throws java.sql.SQLException {
        try(var conn=dataSource.getConnection();var ps=conn.prepareStatement(
            "SELECT 1 FROM public.tenant_schema_versions v JOIN pg_namespace n ON n.nspname=v.schema_name WHERE v.schema_name=? AND v.model_hash=?")) {
            ps.setString(1,schema);ps.setString(2,fingerprint);
            try(var rs=ps.executeQuery()){return rs.next();}
        }
    }

    private List<String> loadHeadOfficeSchemas() {
        List<String> schemas = new ArrayList<>();
        String sql = "SELECT DISTINCT schema_name FROM public.companies " +
                     "WHERE company_type = 'HEAD_OFFICE' AND is_active = true AND schema_name IS NOT NULL";
        try (Connection conn = dataSource.getConnection();
             ResultSet rs = conn.prepareStatement(sql).executeQuery()) {
            while (rs.next()) {
                String s = rs.getString("schema_name");
                if (s != null && !s.isBlank()) {
                    schemas.add(s);
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load tenant schemas",e);
        }
        return schemas;
    }
}
