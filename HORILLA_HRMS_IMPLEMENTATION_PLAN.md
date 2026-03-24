# Horilla HRMS — Spring Boot Implementation Plan

> **Project**: `com.example.demo` · Spring Boot 4.0.3 · Java 21 · PostgreSQL 16
> **Source**: Exact replica of Horilla HRMS Django project (excluding Biometric, Geo-fencing, Face Detection, Google Cloud, Microsoft Auth)

---

## 1. Final Package Structure

```
src/main/java/com/example/demo/
├── DemoApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── JwtConfig.java
│   ├── JpaAuditingConfig.java
│   ├── SchedulerConfig.java
│   └── WebMvcConfig.java
├── common/
│   ├── entity/BaseEntity.java          ← HorillaModel equivalent
│   ├── filter/CompanyFilter.java       ← HorillaCompanyManager equivalent
│   ├── interceptor/CompanyInterceptor.java
│   ├── context/CompanyContext.java     ← ThreadLocal company store
│   ├── security/JwtTokenProvider.java
│   ├── security/JwtAuthFilter.java
│   └── exception/GlobalExceptionHandler.java
├── module/
│   ├── base/
│   │   ├── entity/
│   │   ├── repository/
│   │   ├── service/
│   │   ├── controller/
│   │   └── dto/
│   ├── employee/
│   ├── attendance/
│   ├── leave/
│   ├── payroll/
│   ├── recruitment/
│   ├── onboarding/
│   ├── offboarding/
│   ├── pms/
│   ├── asset/
│   ├── helpdesk/
│   ├── project/
│   ├── notification/
│   └── automation/
src/main/resources/
├── application.properties
├── application-dev.properties
└── db/migration/                       ← Flyway migrations (optional)
```

---

## 2. pom.xml — Full Dependencies

Replace the existing `pom.xml` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.0.3</version>
    <relativePath/>
  </parent>

  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>Horilla HRMS</name>

  <properties>
    <java.version>21</java.version>
    <jjwt.version>0.12.6</jjwt.version>
  </properties>

  <dependencies>
    <!-- Web -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Security -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- JWT -->
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>${jjwt.version}</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>

    <!-- JPA + PostgreSQL -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>

    <!-- Validation -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Lombok -->
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>

    <!-- MapStruct (DTO mapping) -->
    <dependency>
      <groupId>org.mapstruct</groupId>
      <artifactId>mapstruct</artifactId>
      <version>1.6.3</version>
    </dependency>
    <dependency>
      <groupId>org.mapstruct</groupId>
      <artifactId>mapstruct-processor</artifactId>
      <version>1.6.3</version>
      <scope>provided</scope>
    </dependency>

    <!-- Thymeleaf (server-side templates) -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
    <dependency>
      <groupId>org.thymeleaf.extras</groupId>
      <artifactId>thymeleaf-extras-springsecurity6</artifactId>
    </dependency>

    <!-- File upload / Apache POI (Excel) -->
    <dependency>
      <groupId>org.apache.poi</groupId>
      <artifactId>poi-ooxml</artifactId>
      <version>5.3.0</version>
    </dependency>

    <!-- PDF generation -->
    <dependency>
      <groupId>com.itextpdf</groupId>
      <artifactId>itext-core</artifactId>
      <version>9.1.0</version>
      <type>pom</type>
    </dependency>

    <!-- Flyway (DB migrations) -->
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-database-postgresql</artifactId>
    </dependency>

    <!-- Scheduling -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-quartz</artifactId>
    </dependency>

    <!-- Mail -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>

    <!-- Springdoc OpenAPI (Swagger) -->
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.8.8</version>
    </dependency>

    <!-- Test -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
          <annotationProcessorPaths>
            <path>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </path>
            <path>
              <groupId>org.mapstruct</groupId>
              <artifactId>mapstruct-processor</artifactId>
              <version>1.6.3</version>
            </path>
          </annotationProcessorPaths>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

## 3. application.properties

```properties
spring.application.name=horilla-hrms

# PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/horilla
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.open-in-view=false

# Flyway
spring.flyway.enabled=false

# File upload
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
file.upload-dir=./media

# JWT
app.jwt.secret=horilla-hrms-secret-key-must-be-at-least-256-bits-long-for-hs256
app.jwt.expiration-ms=2592000000

# Session timeout (5 min)
server.servlet.session.timeout=300s

# Mail
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Springdoc
springdoc.api-docs.path=/api/docs
springdoc.swagger-ui.path=/api/swagger-ui.html

# Scheduling
spring.quartz.job-store-type=memory
```

---

## 4. Django → Spring Boot Mapping Reference

| Django | Spring Boot |
|--------|-------------|
| `models.Model` | `@Entity` JPA class |
| `HorillaModel` | `BaseEntity` abstract class |
| `CharField(max_length=N)` | `@Column(length=N) String` |
| `TextField` | `@Column(columnDefinition="TEXT") String` |
| `IntegerField` | `Integer` |
| `FloatField` | `Double` |
| `DecimalField(max_digits, decimal_places)` | `BigDecimal` with `@Column(precision, scale)` |
| `BooleanField(default=True)` | `boolean` with `@Column` default |
| `DateField` | `LocalDate` |
| `DateTimeField(auto_now_add)` | `@CreatedDate LocalDateTime` |
| `TimeField` | `LocalTime` |
| `JSONField` | `@JdbcTypeCode(SqlTypes.JSON) String` or `Map<String,Object>` |
| `ImageField / FileField` | `String` (store path) |
| `EmailField` | `@Email String` |
| `ForeignKey(on_delete=CASCADE)` | `@ManyToOne @JoinColumn` + `cascade=REMOVE` |
| `ForeignKey(on_delete=PROTECT)` | `@ManyToOne @JoinColumn` (no cascade) |
| `ForeignKey(on_delete=SET_NULL)` | `@ManyToOne(optional=true)` |
| `OneToOneField` | `@OneToOne @JoinColumn` |
| `ManyToManyField` | `@ManyToMany @JoinTable` |
| `unique_together` | `@Table(uniqueConstraints=@UniqueConstraint(...))` |
| `choices` | Java `enum` |
| `HorillaCompanyManager` | JPA Specification + `CompanyContext` ThreadLocal |
| Django signals | Spring `@EventListener` / `ApplicationEventPublisher` |
| Django middleware | Spring `HandlerInterceptor` |
| Django views (CRUD) | `@RestController` + `@Service` + `JpaRepository` |
| Django permissions | Spring Security `@PreAuthorize("hasAuthority('...')")` |
| APScheduler | `@Scheduled` or Quartz `Job` |
| Django forms (validation) | `@Valid` + Jakarta Bean Validation on DTOs |

---

## 5. Common Infrastructure

### 5.1 BaseEntity
```java
// com/example/demo/common/entity/BaseEntity.java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "is_active")
    private boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### 5.2 CompanyContext (ThreadLocal)
```java
// com/example/demo/common/context/CompanyContext.java
public class CompanyContext {
    private static final ThreadLocal<Long> CURRENT_COMPANY = new ThreadLocal<>();

    public static void set(Long companyId) { CURRENT_COMPANY.set(companyId); }
    public static Long get() { return CURRENT_COMPANY.get(); }
    public static void clear() { CURRENT_COMPANY.remove(); }
}
```

### 5.3 Company Interceptor
```java
// com/example/demo/common/interceptor/CompanyInterceptor.java
@Component
public class CompanyInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Long companyId = (Long) session.getAttribute("selectedCompany");
            CompanyContext.set(companyId);
        }
        return true;
    }
    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        CompanyContext.clear();
    }
}
```

### 5.4 Generic Company-Scoped Repository Pattern
```java
// Every repository that needs company filtering uses Specification:
public interface CompanyScoped {
    default Specification<T> byCompany(String companyField) {
        return (root, query, cb) -> {
            Long cid = CompanyContext.get();
            if (cid == null) return cb.conjunction();
            return cb.equal(root.get(companyField).get("id"), cid);
        };
    }
}
```

---

## 6. Module: BASE Entities

### Company.java
```java
@Entity @Table(name = "companies",
    uniqueConstraints = @UniqueConstraint(columnNames = {"company","address"}))
@Getter @Setter
public class Company extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_company_id")
    private Company parentCompany;

    @Column(name = "company", length = 50, nullable = false)
    private String company;

    @Column(name = "hq")
    private boolean hq = false;

    @Column(name = "address", length = 255, nullable = false)
    private String address;

    @Column(name = "country", length = 50)
    private String country;

    @Column(name = "state", length = 50)
    private String state;

    @Column(name = "city", length = 50)
    private String city;

    @Column(name = "zip", length = 20)
    private String zip;

    @Column(name = "icon")
    private String icon;  // file path

    @Column(name = "date_format", length = 30)
    private String dateFormat;

    @Column(name = "time_format", length = 20)
    private String timeFormat;

    @OneToMany(mappedBy = "parentCompany")
    private List<Company> subCompanies = new ArrayList<>();
}
```

### Department.java
```java
@Entity @Table(name = "departments")
@Getter @Setter
public class Department extends BaseEntity {

    @Column(name = "department", length = 50, nullable = false)
    private String department;

    @ManyToMany
    @JoinTable(name = "department_company",
        joinColumns = @JoinColumn(name = "department_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### JobPosition.java
```java
@Entity @Table(name = "job_positions")
@Getter @Setter
public class JobPosition extends BaseEntity {

    @Column(name = "job_position", length = 50, nullable = false)
    private String jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToMany
    @JoinTable(name = "job_position_company",
        joinColumns = @JoinColumn(name = "job_position_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### JobRole.java
```java
@Entity @Table(name = "job_roles",
    uniqueConstraints = @UniqueConstraint(columnNames = {"job_position_id","job_role"}))
@Getter @Setter
public class JobRole extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id", nullable = false)
    private JobPosition jobPosition;

    @Column(name = "job_role", length = 50)
    private String jobRole;

    @ManyToMany
    @JoinTable(name = "job_role_company",
        joinColumns = @JoinColumn(name = "job_role_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### WorkType.java
```java
@Entity @Table(name = "work_types")
@Getter @Setter
public class WorkType extends BaseEntity {
    @Column(name = "work_type", length = 50)
    private String workType;

    @ManyToMany
    @JoinTable(name = "work_type_company",
        joinColumns = @JoinColumn(name = "work_type_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### EmployeeType.java
```java
@Entity @Table(name = "employee_types")
@Getter @Setter
public class EmployeeType extends BaseEntity {
    @Column(name = "employee_type", length = 50)
    private String employeeType;

    @ManyToMany
    @JoinTable(name = "employee_type_company",
        joinColumns = @JoinColumn(name = "employee_type_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### EmployeeShift.java
```java
@Entity @Table(name = "employee_shifts")
@Getter @Setter
public class EmployeeShift extends BaseEntity {

    @Column(name = "employee_shift", length = 50)
    private String employeeShift;

    @Column(name = "minimum_working_hour", length = 6)
    private String minimumWorkingHour = "00:00";

    @Column(name = "weekly_at_work", length = 6)
    private String weeklyAtWork;

    @ManyToMany
    @JoinTable(name = "shift_company",
        joinColumns = @JoinColumn(name = "shift_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### EmployeeShiftDay.java
```java
@Entity @Table(name = "employee_shift_days")
@Getter @Setter
public class EmployeeShiftDay extends BaseEntity {

    public enum Day {
        monday, tuesday, wednesday, thursday, friday, saturday, sunday
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "day", length = 9)
    private Day day;
}
```

### EmployeeShiftSchedule.java
```java
@Entity @Table(name = "employee_shift_schedules")
@Getter @Setter
public class EmployeeShiftSchedule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private EmployeeShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_id")
    private EmployeeShiftDay day;

    @Column(name = "minimum_working_hour", length = 6)
    private String minimumWorkingHour = "00:00";

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "is_night_shift")
    private boolean isNightShift = false;
}
```

### Tags.java
```java
@Entity @Table(name = "tags")
@Getter @Setter
public class Tags extends BaseEntity {
    @Column(name = "title", length = 50)
    private String title;

    @Column(name = "color", length = 30)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### Holiday.java
```java
@Entity @Table(name = "holidays")
@Getter @Setter
public class Holiday extends BaseEntity {
    @Column(name = "name", length = 50, nullable = false)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "recurring")
    private boolean recurring = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### CompanyLeave.java
```java
@Entity @Table(name = "company_leaves",
    uniqueConstraints = @UniqueConstraint(columnNames = {"based_on_week","based_on_week_day"}))
@Getter @Setter
public class CompanyLeave extends BaseEntity {

    // null = every week, "0"–"4" = First–Fifth Week
    @Column(name = "based_on_week", length = 10)
    private String basedOnWeek;

    // "0"=Monday … "6"=Sunday
    @Column(name = "based_on_week_day", length = 10, nullable = false)
    private String basedOnWeekDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### HorillaMailTemplate.java
```java
@Entity @Table(name = "mail_templates")
@Getter @Setter
public class HorillaMailTemplate extends BaseEntity {
    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### EmailLog.java
```java
@Entity @Table(name = "email_logs")
@Getter @Setter
public class EmailLog extends BaseEntity {
    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "to_address", columnDefinition = "TEXT")
    private String toAddress;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "status", length = 20)
    private String status;  // sent | failed

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### ShiftRequest.java
```java
@Entity @Table(name = "shift_requests")
@Getter @Setter
public class ShiftRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_shift_id", nullable = false)
    private EmployeeShift requestedShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_shift_id")
    private EmployeeShift previousShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Column(name = "requested_till")
    private LocalDate requestedTill;

    @Column(name = "approved")
    private boolean approved = false;

    @Column(name = "canceled")
    private boolean canceled = false;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
```

---

## 7. Module: EMPLOYEE Entities

### Employee.java
```java
@Entity @Table(name = "employees",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"employee_first_name","employee_last_name","email"}))
@Getter @Setter
@EntityListeners(EmployeeEntityListener.class)
public class Employee extends BaseEntity {

    public enum Gender { male, female, other }
    public enum MaritalStatus { single, married, divorced }

    @Column(name = "badge_id", length = 50, unique = true)
    private String badgeId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "employee_first_name", length = 200, nullable = false)
    private String employeeFirstName;

    @Column(name = "employee_last_name", length = 200)
    private String employeeLastName;

    @Column(name = "employee_profile")
    private String employeeProfile;  // file path

    @Email
    @Column(name = "email", length = 254, nullable = false, unique = true)
    private String email;

    @Column(name = "phone", length = 25, nullable = false)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "city", length = 30)
    private String city;

    @Column(name = "zip", length = 20)
    private String zip;

    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender = Gender.male;

    @Column(name = "qualification", length = 50)
    private String qualification;

    @Column(name = "experience")
    private Integer experience;

    @Enumerated(EnumType.STRING)
    @Column(name = "marital_status", length = 50)
    private MaritalStatus maritalStatus = MaritalStatus.single;

    @Column(name = "children")
    private Integer children;

    @Column(name = "emergency_contact", length = 15)
    private String emergencyContact;

    @Column(name = "emergency_contact_name", length = 20)
    private String emergencyContactName;

    @Column(name = "emergency_contact_relation", length = 20)
    private String emergencyContactRelation;

    @Column(name = "additional_info", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> additionalInfo;

    @Column(name = "is_from_onboarding")
    private boolean isFromOnboarding = false;

    @Column(name = "is_directly_converted")
    private boolean isDirectlyConverted = false;

    @OneToOne(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private EmployeeWorkInformation workInformation;

    @OneToOne(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private EmployeeBankDetails bankDetails;

    @OneToOne(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private BonusPoint bonusPoint;

    public String getFullName() {
        return employeeLastName != null
            ? employeeFirstName + " " + employeeLastName
            : employeeFirstName;
    }
}
```

### EmployeeWorkInformation.java
```java
@Entity @Table(name = "employee_work_information")
@Getter @Setter
public class EmployeeWorkInformation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", unique = true)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_role_id")
    private JobRole jobRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporting_manager_id")
    private Employee reportingManager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private EmployeeShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_type_id")
    private EmployeeType employeeType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "location", length = 50)
    private String location;

    @Email
    @Column(name = "email", length = 254)
    private String email;  // work email

    @Column(name = "mobile", length = 254)
    private String mobile;  // work phone

    @Column(name = "date_joining")
    private LocalDate dateJoining;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @Column(name = "basic_salary", precision = 10, scale = 2)
    private BigDecimal basicSalary = BigDecimal.ZERO;

    @Column(name = "housing_allowance", precision = 10, scale = 2)
    private BigDecimal housingAllowance = BigDecimal.ZERO;

    @Column(name = "transport_allowance", precision = 10, scale = 2)
    private BigDecimal transportAllowance = BigDecimal.ZERO;

    @Column(name = "other_allowance", precision = 10, scale = 2)
    private BigDecimal otherAllowance = BigDecimal.ZERO;

    @Column(name = "salary_hour")
    private Integer salaryHour = 0;

    @Column(name = "experience")
    private Double experience = 0.0;

    @Column(name = "additional_info", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> additionalInfo;

    @ManyToMany
    @JoinTable(name = "employee_work_info_tags",
        joinColumns = @JoinColumn(name = "work_info_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<EmployeeTag> tags = new HashSet<>();

    public BigDecimal getTotalSalary() {
        return basicSalary.add(housingAllowance)
                          .add(transportAllowance)
                          .add(otherAllowance);
    }
}
```

### EmployeeBankDetails.java
```java
@Entity @Table(name = "employee_bank_details")
@Getter @Setter
public class EmployeeBankDetails extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", unique = true)
    private Employee employee;

    @Column(name = "bank_name", length = 50, nullable = false)
    private String bankName;

    @Column(name = "account_number", length = 50, unique = true)
    private String accountNumber;

    @Column(name = "branch", length = 50)
    private String branch;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "country", length = 50)
    private String country;

    @Column(name = "state", length = 50)
    private String state;

    @Column(name = "city", length = 50)
    private String city;

    @Column(name = "bank_code1", length = 50)
    private String bankCode1;

    @Column(name = "bank_code2", length = 50)
    private String bankCode2;

    @Column(name = "additional_info", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> additionalInfo;
}
```

### EmployeeTag.java
```java
@Entity @Table(name = "employee_tags")
@Getter @Setter
public class EmployeeTag extends BaseEntity {
    @Column(name = "title", length = 50)
    private String title;

    @Column(name = "color", length = 30)
    private String color;
}
```

### BonusPoint.java
```java
@Entity @Table(name = "bonus_points")
@Getter @Setter
public class BonusPoint extends BaseEntity {

    public enum Condition { EQ, GT, LT, GTE, LTE }

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", unique = true)
    private Employee employee;

    @Column(name = "points")
    private int points = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "encashment_condition", length = 10)
    private Condition encashmentCondition;

    @Column(name = "redeeming_points")
    private Integer redeemingPoints;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
```

### Actiontype.java
```java
@Entity @Table(name = "action_types")
@Getter @Setter
public class Actiontype extends BaseEntity {

    public enum ActionTypeEnum { warning, suspension, dismissal }

    @Column(name = "title", length = 50, nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", length = 30, nullable = false)
    private ActionTypeEnum actionType;

    @Column(name = "block_option")
    private boolean blockOption = false;
}
```

### DisciplinaryAction.java
```java
@Entity @Table(name = "disciplinary_actions")
@Getter @Setter
public class DisciplinaryAction extends BaseEntity {

    public enum UnitIn { days, hours }

    @ManyToMany
    @JoinTable(name = "disciplinary_action_employees",
        joinColumns = @JoinColumn(name = "action_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> employees = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_id", nullable = false)
    private Actiontype action;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_in", length = 10)
    private UnitIn unitIn = UnitIn.days;

    @Column(name = "days")
    private Integer days = 1;

    @Column(name = "hours", length = 6)
    private String hours = "00:00";

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "attachment")
    private String attachment;  // file path
}
```

### Policy.java
```java
@Entity @Table(name = "policies")
@Getter @Setter
public class Policy extends BaseEntity {
    @Column(name = "title", length = 50, nullable = false)
    private String title;

    @Column(name = "body", columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "is_visible_to_all")
    private boolean isVisibleToAll = true;

    @ManyToMany
    @JoinTable(name = "policy_employees",
        joinColumns = @JoinColumn(name = "policy_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> specificEmployees = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "policy_companies",
        joinColumns = @JoinColumn(name = "policy_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(name = "policy_attachments",
        joinColumns = @JoinColumn(name = "policy_id"),
        inverseJoinColumns = @JoinColumn(name = "file_id"))
    private List<PolicyFile> attachments = new ArrayList<>();
}
```

---

## 8. Module: ATTENDANCE Entities

### AttendanceActivity.java
```java
@Entity @Table(name = "attendance_activities")
@Getter @Setter
public class AttendanceActivity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date")
    private LocalDate attendanceDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_day_id")
    private EmployeeShiftDay shiftDay;

    @Column(name = "in_datetime")
    private LocalDateTime inDatetime;

    @Column(name = "clock_in_date")
    private LocalDate clockInDate;

    @Column(name = "clock_in", nullable = false)
    private LocalTime clockIn;

    @Column(name = "out_datetime")
    private LocalDateTime outDatetime;

    @Column(name = "clock_out_date")
    private LocalDate clockOutDate;

    @Column(name = "clock_out")
    private LocalTime clockOut;
}
```

### Attendance.java
```java
@Entity @Table(name = "attendances",
    uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id","attendance_date"}))
@Getter @Setter
public class Attendance extends BaseEntity {

    public enum RequestType {
        create_request, update_request, revalidate_request
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private EmployeeShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_day_id")
    private EmployeeShiftDay attendanceDay;

    @Column(name = "attendance_clock_in_date")
    private LocalDate attendanceClockInDate;

    @Column(name = "attendance_clock_in")
    private LocalTime attendanceClockIn;

    @Column(name = "attendance_clock_out_date")
    private LocalDate attendanceClockOutDate;

    @Column(name = "attendance_clock_out")
    private LocalTime attendanceClockOut;

    @Column(name = "attendance_worked_hour", length = 10)
    private String attendanceWorkedHour = "00:00";

    @Column(name = "minimum_hour", length = 10)
    private String minimumHour = "00:00";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_attendance_id")
    private BatchAttendance batchAttendance;

    @Column(name = "attendance_overtime", length = 10)
    private String attendanceOvertime = "00:00";

    @Column(name = "attendance_overtime_approve")
    private boolean attendanceOvertimeApprove = false;

    @Column(name = "attendance_validated")
    private boolean attendanceValidated = false;

    @Column(name = "at_work_second")
    private Integer atWorkSecond;

    @Column(name = "overtime_second")
    private Integer overtimeSecond;

    @Column(name = "approved_overtime_second")
    private int approvedOvertimeSecond = 0;

    @Column(name = "is_validate_request")
    private boolean isValidateRequest = false;

    @Column(name = "is_bulk_request")
    private boolean isBulkRequest = false;

    @Column(name = "is_validate_request_approved")
    private boolean isValidateRequestApproved = false;

    @Column(name = "request_description", columnDefinition = "TEXT")
    private String requestDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", length = 18)
    private RequestType requestType = RequestType.update_request;

    @Column(name = "is_holiday")
    private boolean isHoliday = false;

    @Column(name = "requested_data", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> requestedData;
}
```

### AttendanceOverTime.java
```java
@Entity @Table(name = "attendance_overtime",
    uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id","month","year"}))
@Getter @Setter
public class AttendanceOverTime extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "month", length = 3, nullable = false)
    private String month;   // Jan–Dec

    @Column(name = "year", length = 10, nullable = false)
    private String year;

    @Column(name = "overtime", length = 10)
    private String overtime = "00:00";

    @Column(name = "hour_account", length = 10)
    private String hourAccount = "00:00";

    @Column(name = "hour_pending", length = 10)
    private String hourPending = "00:00";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### AttendanceValidationCondition.java
```java
@Entity @Table(name = "attendance_validation_conditions")
@Getter @Setter
public class AttendanceValidationCondition extends BaseEntity {

    @Column(name = "validation_at_work", length = 6, nullable = false)
    private String validationAtWork;

    @Column(name = "minimum_overtime_to_approve", length = 6)
    private String minimumOvertimeToApprove;

    @Column(name = "overtime_cutoff", length = 6)
    private String overtimeCutoff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### GraceTime.java
```java
@Entity @Table(name = "grace_times")
@Getter @Setter
public class GraceTime extends BaseEntity {
    @Column(name = "allowed_time", length = 10)
    private String allowedTime = "00:00";

    @Column(name = "allowed_time_in_secs")
    private int allowedTimeInSecs = 0;

    @Column(name = "is_default")
    private boolean isDefault = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

---

## 9. Module: LEAVE Entities

### LeaveType.java
```java
@Entity @Table(name = "leave_types")
@Getter @Setter
public class LeaveType extends BaseEntity {

    public enum Payment { paid, unpaid }
    public enum TimePeriod { day, month, year }
    public enum ResetBased { yearly, monthly, weekly }
    public enum CarryforwardType {
        no_carryforward, carryforward, carryforward_expire
    }
    public enum YesNo { yes, no }

    @Column(name = "icon")
    private String icon;

    @Column(name = "name", length = 30, nullable = false)
    private String name;

    @Column(name = "color", length = 30)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment", length = 30)
    private Payment payment = Payment.unpaid;

    @Column(name = "count")
    private Double count = 1.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_in", length = 30)
    private TimePeriod periodIn = TimePeriod.day;

    @Column(name = "limit_leave")
    private boolean limitLeave = true;

    @Column(name = "total_days")
    private Double totalDays = 1.0;

    @Column(name = "reset")
    private boolean reset = false;

    @Column(name = "is_encashable")
    private boolean isEncashable = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "reset_based", length = 30)
    private ResetBased resetBased;

    @Column(name = "reset_month", length = 2)
    private String resetMonth;  // "1"–"12"

    @Column(name = "reset_day", length = 10)
    private String resetDay;    // "1"–"31" or "last day"

    @Column(name = "reset_weekend", length = 1)
    private String resetWeekend;  // "0"–"6"

    @Enumerated(EnumType.STRING)
    @Column(name = "carryforward_type", length = 30)
    private CarryforwardType carryforwardType = CarryforwardType.no_carryforward;

    @Column(name = "carryforward_max")
    private Double carryforwardMax;

    @Column(name = "carryforward_expire_in")
    private Integer carryforwardExpireIn;

    @Enumerated(EnumType.STRING)
    @Column(name = "carryforward_expire_period", length = 10)
    private TimePeriod carryforwardExpirePeriod;

    @Column(name = "carryforward_expire_date")
    private LocalDate carryforwardExpireDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "require_approval", length = 5)
    private YesNo requireApproval = YesNo.yes;

    @Enumerated(EnumType.STRING)
    @Column(name = "require_attachment", length = 5)
    private YesNo requireAttachment = YesNo.no;

    @Enumerated(EnumType.STRING)
    @Column(name = "exclude_company_leave", length = 5)
    private YesNo excludeCompanyLeave = YesNo.no;

    @Enumerated(EnumType.STRING)
    @Column(name = "exclude_holiday", length = 5)
    private YesNo excludeHoliday = YesNo.no;

    @Column(name = "is_compensatory_leave")
    private boolean isCompensatoryLeave = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### AvailableLeave.java
```java
@Entity @Table(name = "available_leaves",
    uniqueConstraints = @UniqueConstraint(columnNames = {"leave_type_id","employee_id"}))
@Getter @Setter
public class AvailableLeave extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id")
    private LeaveType leaveType;

    @Column(name = "available_days")
    private double availableDays = 0;

    @Column(name = "carryforward_days")
    private double carryforwardDays = 0;

    @Column(name = "total_leave_days")
    private double totalLeaveDays = 0;

    @Column(name = "assigned_date")
    private LocalDate assignedDate = LocalDate.now();

    @Column(name = "reset_date")
    private LocalDate resetDate;

    @Column(name = "expired_date")
    private LocalDate expiredDate;
}
```

### LeaveRequest.java
```java
@Entity @Table(name = "leave_requests")
@Getter @Setter
public class LeaveRequest extends BaseEntity {

    public enum Breakdown { full_day, first_half, second_half }
    public enum Status { requested, approved, cancelled, rejected }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "start_date_breakdown", length = 30)
    private Breakdown startDateBreakdown = Breakdown.full_day;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_date_breakdown", length = 30)
    private Breakdown endDateBreakdown = Breakdown.full_day;

    @Column(name = "requested_days")
    private Double requestedDays;

    @Column(name = "requested_date")
    private LocalDate requestedDate = LocalDate.now();

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "attachment")
    private String attachment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private Status status = Status.requested;

    @Column(name = "approved_available_days")
    private double approvedAvailableDays = 0;

    @Column(name = "approved_carryforward_days")
    private double approvedCarryforwardDays = 0;

    @Column(name = "reject_reason", length = 30)
    private String rejectReason;

    @Column(name = "multiple_approvals")
    private boolean multipleApprovals = false;

    @Column(name = "is_compensatory_leave")
    private boolean isCompensatoryLeave = false;
}
```

### LeaveAllocationRequest.java
```java
@Entity @Table(name = "leave_allocation_requests")
@Getter @Setter
public class LeaveAllocationRequest extends BaseEntity {

    public enum Status { requested, approved, rejected }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "requested_days", nullable = false)
    private double requestedDays;

    @Column(name = "requested_date")
    private LocalDate requestedDate = LocalDate.now();

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "attachment")
    private String attachment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private Status status = Status.requested;

    @Column(name = "reject_reason", length = 30)
    private String rejectReason;
}
```

---

## 10. Module: PAYROLL Entities

### FilingStatus.java
```java
@Entity @Table(name = "filing_statuses")
@Getter @Setter
public class FilingStatus extends BaseEntity {

    public enum BasedOn { basic_pay, gross_pay, taxable_gross_pay }

    @Column(name = "filing_status", length = 30, nullable = false)
    private String filingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "based_on", length = 50, nullable = false)
    private BasedOn basedOn = BasedOn.taxable_gross_pay;

    @Column(name = "use_py")
    private boolean usePy = false;

    @Column(name = "python_code", columnDefinition = "TEXT")
    private String pythonCode;  // renamed to logic_code for Java

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### Contract.java
```java
@Entity @Table(name = "contracts")
@Getter @Setter
public class Contract extends BaseEntity {

    public enum WageType { daily, monthly, hourly }
    public enum PayFrequency { weekly, monthly, semi_monthly }
    public enum ContractStatus { draft, active, expired, terminated }

    @Column(name = "contract_name", length = 250, nullable = false)
    private String contractName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "contract_start_date", nullable = false)
    private LocalDate contractStartDate;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "wage_type", length = 20)
    private WageType wageType = WageType.monthly;

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_frequency", length = 20)
    private PayFrequency payFrequency = PayFrequency.monthly;

    @Column(name = "wage")
    private Double wage = 0.0;

    @Column(name = "housing_allowance")
    private Double housingAllowance = 0.0;

    @Column(name = "transport_allowance")
    private Double transportAllowance = 0.0;

    @Column(name = "other_allowance")
    private Double otherAllowance = 0.0;

    @Column(name = "total_salary")
    private Double totalSalary = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filing_status_id")
    private FilingStatus filingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status", length = 15)
    private ContractStatus contractStatus = ContractStatus.draft;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_role_id")
    private JobRole jobRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private EmployeeShift shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
```

### Payslip.java
```java
@Entity @Table(name = "payslips")
@Getter @Setter
public class Payslip extends BaseEntity {

    public enum Status { draft, review, confirmed, paid }

    @Column(name = "reference", length = 255, nullable = false)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "pay_head_data", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payHeadData;

    @Column(name = "contract_wage")
    private Double contractWage = 0.0;

    @Column(name = "basic_pay")
    private Double basicPay = 0.0;

    @Column(name = "gross_pay")
    private Double grossPay = 0.0;

    @Column(name = "deduction")
    private Double deduction = 0.0;

    @Column(name = "net_pay")
    private Double netPay = 0.0;

    @Column(name = "overtime_pay")
    private Double overtimePay = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.draft;
}
```

---

## 11. Module: RECRUITMENT Entities

### SurveyTemplate.java
```java
@Entity @Table(name = "survey_templates")
@Getter @Setter
public class SurveyTemplate extends BaseEntity {
    @Column(name = "title", length = 50, nullable = false, unique = true)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_general_template")
    private boolean isGeneralTemplate = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### Skill.java
```java
@Entity @Table(name = "skills")
@Getter @Setter
public class Skill extends BaseEntity {
    @Column(name = "title", length = 100, nullable = false)
    private String title;
}
```

### Recruitment.java
```java
@Entity @Table(name = "recruitments")
@Getter @Setter
public class Recruitment extends BaseEntity {

    @Column(name = "title", length = 50)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_event_based")
    private boolean isEventBased = false;

    @Column(name = "closed")
    private boolean closed = false;

    @Column(name = "is_published")
    private boolean isPublished = true;

    @ManyToMany
    @JoinTable(name = "recruitment_open_positions",
        joinColumns = @JoinColumn(name = "recruitment_id"),
        inverseJoinColumns = @JoinColumn(name = "job_position_id"))
    private Set<JobPosition> openPositions = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @Column(name = "vacancy")
    private Integer vacancy;

    @ManyToMany
    @JoinTable(name = "recruitment_managers",
        joinColumns = @JoinColumn(name = "recruitment_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> recruitmentManagers = new HashSet<>();

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_template_id")
    private SurveyTemplate surveyTemplate;
}
```

### Stage.java (Recruitment Stage)
```java
@Entity @Table(name = "recruitment_stages")
@Getter @Setter
public class Stage extends BaseEntity {

    public enum StageType { initial, test, interview, offer, hired, cancelled }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private Recruitment recruitment;

    @Column(name = "stage", length = 50, nullable = false)
    private String stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_type", length = 20)
    private StageType stageType;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @ManyToMany
    @JoinTable(name = "stage_managers",
        joinColumns = @JoinColumn(name = "stage_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> stageManagers = new HashSet<>();
}
```

### Candidate.java
```java
@Entity @Table(name = "candidates")
@Getter @Setter
public class Candidate extends BaseEntity {

    public enum Gender { male, female, other }
    public enum Source { application, software, source }

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "profile_pic")
    private String profilePic;

    @Email
    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "mobile", length = 15)
    private String mobile;

    @Column(name = "resume")
    private String resume;  // file path

    @Column(name = "referred_by", length = 50)
    private String referredBy;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "country", length = 50)
    private String country;

    @Column(name = "dob")
    private LocalDate dob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_id")
    private Recruitment recruitment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    @Column(name = "schedule_date")
    private LocalDateTime scheduleDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender;

    @Column(name = "start_onboard")
    private boolean startOnboard = false;

    @Column(name = "hired")
    private boolean hired = false;

    @Column(name = "canceled")
    private boolean canceled = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_employee_id")
    private Employee convertedEmployee;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @ManyToMany
    @JoinTable(name = "candidate_skills",
        joinColumns = @JoinColumn(name = "candidate_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id"))
    private Set<Skill> skills = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20)
    private Source source;

    @Column(name = "portal", length = 100)
    private String portal;
}
```

---

## 12. Module: ONBOARDING Entities

### OnboardingStage.java
```java
@Entity @Table(name = "onboarding_stages")
@Getter @Setter
public class OnboardingStage extends BaseEntity {

    @Column(name = "stage_title", length = 200, nullable = false)
    private String stageTitle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_id")
    private Recruitment recruitment;

    @ManyToMany
    @JoinTable(name = "onboarding_stage_managers",
        joinColumns = @JoinColumn(name = "stage_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> stageManagers = new HashSet<>();

    @Column(name = "sequence")
    private Integer sequence;

    @Column(name = "is_final_stage")
    private boolean isFinalStage = false;
}
```

### OnboardingTask.java
```java
@Entity @Table(name = "onboarding_tasks")
@Getter @Setter
public class OnboardingTask extends BaseEntity {

    @Column(name = "task_title", length = 200, nullable = false)
    private String taskTitle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private OnboardingStage stage;

    @ManyToMany
    @JoinTable(name = "onboarding_task_candidates",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "candidate_id"))
    private Set<Candidate> candidates = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "onboarding_task_managers",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> taskManagers = new HashSet<>();
}
```

### CandidateStage.java
```java
@Entity @Table(name = "candidate_stages")
@Getter @Setter
public class CandidateStage extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", unique = true)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "onboarding_stage_id")
    private OnboardingStage onboardingStage;

    @Column(name = "onboarding_end_date")
    private LocalDate onboardingEndDate;

    @Column(name = "sequence")
    private Integer sequence = 0;
}
```

### CandidateTask.java
```java
@Entity @Table(name = "candidate_tasks")
@Getter @Setter
public class CandidateTask extends BaseEntity {

    public enum Status { todo, scheduled, ongoing, stuck, done }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private OnboardingStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.todo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "onboarding_task_id", nullable = false)
    private OnboardingTask onboardingTask;
}
```

### OnboardingPortal.java
```java
@Entity @Table(name = "onboarding_portals")
@Getter @Setter
public class OnboardingPortal extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", unique = true)
    private Candidate candidate;

    @Column(name = "token", length = 200, nullable = false)
    private String token;

    @Column(name = "used")
    private boolean used = false;

    @Column(name = "count")
    private int count = 0;

    @Column(name = "profile")
    private String profile;
}
```

---

## 13. Module: OFFBOARDING Entities

### Offboarding.java
```java
@Entity @Table(name = "offboardings")
@Getter @Setter
public class Offboarding extends BaseEntity {

    public enum Status { ongoing, completed }

    @Column(name = "title", length = 20, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToMany
    @JoinTable(name = "offboarding_managers",
        joinColumns = @JoinColumn(name = "offboarding_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> managers = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10)
    private Status status = Status.ongoing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### OffboardingStage.java
```java
@Entity @Table(name = "offboarding_stages")
@Getter @Setter
public class OffboardingStage extends BaseEntity {

    public enum Type { notice_period, fnf, other, interview, handover, archived }

    @Column(name = "title", length = 20, nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 13, nullable = false)
    private Type type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offboarding_id", nullable = false)
    private Offboarding offboarding;

    @ManyToMany
    @JoinTable(name = "offboarding_stage_managers",
        joinColumns = @JoinColumn(name = "stage_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> managers = new HashSet<>();

    @Column(name = "sequence")
    private int sequence = 0;
}
```

### OffboardingEmployee.java
```java
@Entity @Table(name = "offboarding_employees")
@Getter @Setter
public class OffboardingEmployee extends BaseEntity {

    public enum Unit { day, month }

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", unique = true, nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private OffboardingStage stage;

    @Column(name = "notice_period")
    private Integer noticePeriod;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit", length = 10)
    private Unit unit = Unit.month;

    @Column(name = "notice_period_starts")
    private LocalDate noticePeriodStarts;

    @Column(name = "notice_period_ends")
    private LocalDate noticePeriodEnds;
}
```

### ResignationLetter.java
```java
@Entity @Table(name = "resignation_letters")
@Getter @Setter
public class ResignationLetter extends BaseEntity {

    public enum Status { requested, approved, rejected }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "title", length = 100)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "planned_to_leave_on", nullable = false)
    private LocalDate plannedToLeaveOn;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10)
    private Status status = Status.requested;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offboarding_employee_id")
    private OffboardingEmployee offboardingEmployee;
}
```

### OffboardingTask.java
```java
@Entity @Table(name = "offboarding_tasks",
    uniqueConstraints = @UniqueConstraint(columnNames = {"title","stage_id"}))
@Getter @Setter
public class OffboardingTask extends BaseEntity {

    @Column(name = "title", length = 30, nullable = false)
    private String title;

    @ManyToMany
    @JoinTable(name = "offboarding_task_managers",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> managers = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private OffboardingStage stage;
}
```

### EmployeeTask.java (offboarding)
```java
@Entity @Table(name = "offboarding_employee_tasks",
    uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id","task_id"}))
@Getter @Setter
public class EmployeeTask extends BaseEntity {

    public enum Status { todo, in_progress, stuck, completed }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private OffboardingEmployee offboardingEmployee;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.todo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private OffboardingTask task;
}
```

---

## 14. Module: PMS Entities

### Period.java
```java
@Entity @Table(name = "pms_periods")
@Getter @Setter
public class Period extends BaseEntity {
    @Column(name = "period_name", length = 150, nullable = false, unique = true)
    private String periodName;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @ManyToMany
    @JoinTable(name = "period_companies",
        joinColumns = @JoinColumn(name = "period_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### KeyResult.java
```java
@Entity @Table(name = "key_results")
@Getter @Setter
public class KeyResult extends BaseEntity {

    public enum ProgressType { PERCENTAGE, NUMBER, USD, INR, EUR }

    @Column(name = "title", length = 60)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "progress_type", length = 20)
    private ProgressType progressType = ProgressType.PERCENTAGE;

    @Column(name = "target_value")
    private Integer targetValue = 100;

    @Column(name = "duration")
    private Integer duration;

    @Column(name = "archive")
    private boolean archive = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### Objective.java
```java
@Entity @Table(name = "objectives")
@Getter @Setter
public class Objective extends BaseEntity {

    public enum DurationUnit { days, months, years }

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @ManyToMany
    @JoinTable(name = "objective_managers",
        joinColumns = @JoinColumn(name = "objective_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> managers = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "objective_assignees",
        joinColumns = @JoinColumn(name = "objective_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> assignees = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "objective_key_results",
        joinColumns = @JoinColumn(name = "objective_id"),
        inverseJoinColumns = @JoinColumn(name = "key_result_id"))
    private Set<KeyResult> keyResults = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "duration_unit", length = 10)
    private DurationUnit durationUnit = DurationUnit.days;

    @Column(name = "duration")
    private int duration = 1;

    @Column(name = "add_assignees")
    private boolean addAssignees = false;

    @Column(name = "archive")
    private boolean archive = false;

    @Column(name = "self_employee_progress_update")
    private boolean selfEmployeeProgressUpdate = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### EmployeeObjective.java
```java
@Entity @Table(name = "employee_objectives")
@Getter @Setter
public class EmployeeObjective extends BaseEntity {

    public enum Status { not_started, in_progress, at_risk, late, completed }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "objective_id", nullable = false)
    private Objective objective;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.not_started;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id")
    private Period period;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;
}
```

### EmployeeKeyResult.java
```java
@Entity @Table(name = "employee_key_results")
@Getter @Setter
public class EmployeeKeyResult extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_objective_id", nullable = false)
    private EmployeeObjective employeeObjective;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "key_result_id", nullable = false)
    private KeyResult keyResult;

    @Column(name = "current_value")
    private int currentValue = 0;

    @Column(name = "target_value", nullable = false)
    private int targetValue;

    @Column(name = "closed")
    private boolean closed = false;
}
```

---

## 15. Module: ASSET Entities

### AssetCategory.java
```java
@Entity @Table(name = "asset_categories")
@Getter @Setter
public class AssetCategory extends BaseEntity {

    @Column(name = "asset_category_name", length = 255, nullable = false, unique = true)
    private String assetCategoryName;

    @Column(name = "asset_category_description", columnDefinition = "TEXT", nullable = false)
    private String assetCategoryDescription;

    @ManyToMany
    @JoinTable(name = "asset_category_companies",
        joinColumns = @JoinColumn(name = "category_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### AssetLot.java
```java
@Entity @Table(name = "asset_lots")
@Getter @Setter
public class AssetLot extends BaseEntity {

    @Column(name = "lot_number", length = 30, nullable = false, unique = true)
    private String lotNumber;

    @Column(name = "lot_description", columnDefinition = "TEXT")
    private String lotDescription;

    @ManyToMany
    @JoinTable(name = "asset_lot_companies",
        joinColumns = @JoinColumn(name = "lot_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id"))
    private Set<Company> companies = new HashSet<>();
}
```

### Asset.java
```java
@Entity @Table(name = "assets")
@Getter @Setter
public class Asset extends BaseEntity {

    public enum AssetStatus { IN_USE, AVAILABLE, NOT_AVAILABLE }

    @Column(name = "asset_name", length = 255, nullable = false)
    private String assetName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private Employee owner;

    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;

    @Column(name = "asset_tracking_id", length = 30, nullable = false, unique = true)
    private String assetTrackingId;

    @Column(name = "asset_purchase_date", nullable = false)
    private LocalDate assetPurchaseDate;

    @Column(name = "asset_purchase_cost", precision = 10, scale = 2, nullable = false)
    private BigDecimal assetPurchaseCost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_category_id", nullable = false)
    private AssetCategory assetCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_status", length = 20)
    private AssetStatus assetStatus = AssetStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_lot_id")
    private AssetLot assetLot;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "notify_before")
    private Integer notifyBefore = 1;
}
```

### AssetAssignment.java
```java
@Entity @Table(name = "asset_assignments")
@Getter @Setter
public class AssetAssignment extends BaseEntity {

    public enum ReturnStatus { healthy, damaged, lost }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_employee_id")
    private Employee assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_employee_id")
    private Employee assignedBy;

    @Column(name = "assigned_date")
    private LocalDate assignedDate = LocalDate.now();

    @Column(name = "return_date")
    private LocalDate returnDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", length = 10)
    private ReturnStatus returnStatus;

    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;
}
```

### AssetRequest.java
```java
@Entity @Table(name = "asset_requests")
@Getter @Setter
public class AssetRequest extends BaseEntity {

    public enum Status { requested, approved, rejected }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_employee_id", nullable = false)
    private Employee requestedEmployee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_category_id", nullable = false)
    private AssetCategory assetCategory;

    @Column(name = "request_date")
    private LocalDate requestDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15)
    private Status status = Status.requested;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
```

---

## 16. Module: HELPDESK Entities

### TicketType.java
```java
@Entity @Table(name = "ticket_types")
@Getter @Setter
public class TicketType extends BaseEntity {

    public enum Type {
        suggestion, complaint, service_request,
        meeting_request, anounymous_complaint, others
    }

    @Column(name = "title", length = 100, nullable = false, unique = true)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 30, nullable = false)
    private Type type;

    @Column(name = "prefix", length = 3, nullable = false, unique = true)
    private String prefix;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### Ticket.java
```java
@Entity @Table(name = "tickets")
@Getter @Setter
public class Ticket extends BaseEntity {

    public enum Priority { low, medium, high }
    public enum AssigningType { department, job_position, individual }
    public enum TicketStatus { new_, in_progress, on_hold, resolved, canceled }

    @Column(name = "title", length = 50, nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 10)
    private Priority priority = Priority.low;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @Column(name = "resolved_date")
    private LocalDate resolvedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "assigning_type", length = 15, nullable = false)
    private AssigningType assigningType;

    @Column(name = "raised_on", length = 100, nullable = false)
    private String raisedOn;  // ID of dept/position/employee

    @ManyToMany
    @JoinTable(name = "ticket_assigned_to",
        joinColumns = @JoinColumn(name = "ticket_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> assignedTo = new HashSet<>();

    @Column(name = "deadline")
    private LocalDate deadline;

    @ManyToMany
    @JoinTable(name = "ticket_tags",
        joinColumns = @JoinColumn(name = "ticket_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tags> tags = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private TicketStatus status = TicketStatus.new_;
}
```

### TicketComment.java
```java
@Entity @Table(name = "ticket_comments")
@Getter @Setter
public class TicketComment extends BaseEntity {

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
}
```

### FAQCategory.java
```java
@Entity @Table(name = "faq_categories")
@Getter @Setter
public class FAQCategory extends BaseEntity {
    @Column(name = "title", length = 30, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### FAQ.java
```java
@Entity @Table(name = "faqs")
@Getter @Setter
public class FAQ extends BaseEntity {

    @Column(name = "question", length = 255, nullable = false)
    private String question;

    @Column(name = "answer", columnDefinition = "TEXT", nullable = false)
    private String answer;

    @ManyToMany
    @JoinTable(name = "faq_tags",
        joinColumns = @JoinColumn(name = "faq_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tags> tags = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private FAQCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

---

## 17. Module: PROJECT Entities

### Project.java
```java
@Entity @Table(name = "projects")
@Getter @Setter
public class Project extends BaseEntity {

    public enum ProjectStatus { new_, in_progress, completed, on_hold, cancelled, expired }

    @Column(name = "title", length = 200, nullable = false, unique = true)
    private String title;

    @ManyToMany
    @JoinTable(name = "project_managers",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> managers = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "project_members",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> members = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ProjectStatus status = ProjectStatus.new_;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "document")
    private String document;  // file path

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
```

### ProjectStage.java
```java
@Entity @Table(name = "project_stages",
    uniqueConstraints = @UniqueConstraint(columnNames = {"project_id","title"}))
@Getter @Setter
public class ProjectStage extends BaseEntity {

    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "sequence")
    private Integer sequence;

    @Column(name = "is_end_stage")
    private boolean isEndStage = false;
}
```

### Task.java
```java
@Entity @Table(name = "tasks",
    uniqueConstraints = @UniqueConstraint(columnNames = {"project_id","title"}))
@Getter @Setter
public class Task extends BaseEntity {

    public enum TaskStatus { to_do, in_progress, completed, expired }

    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private ProjectStage stage;

    @ManyToMany
    @JoinTable(name = "task_managers",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> taskManagers = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "task_members",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    private Set<Employee> taskMembers = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private TaskStatus status = TaskStatus.to_do;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "document")
    private String document;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "sequence")
    private int sequence = 0;
}
```

### TimeSheet.java
```java
@Entity @Table(name = "timesheets")
@Getter @Setter
public class TimeSheet extends BaseEntity {

    public enum Status { in_Progress, completed }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "date", nullable = false)
    private LocalDate date = LocalDate.now();

    @Column(name = "time_spent", length = 10)
    private String timeSpent = "00:00";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.in_Progress;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
```

---

## 18. Module: NOTIFICATION Entity

### Notification.java
```java
@Entity @Table(name = "notifications")
@Getter @Setter
public class Notification extends BaseEntity {

    public enum Level { success, info, warning, error }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(name = "actor_type", length = 100)
    private String actorType;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "verb", length = 255, nullable = false)
    private String verb;

    @Column(name = "verb_ar", length = 255)
    private String verbAr;

    @Column(name = "verb_de", length = 255)
    private String verbDe;

    @Column(name = "verb_es", length = 255)
    private String verbEs;

    @Column(name = "verb_fr", length = 255)
    private String verbFr;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "unread")
    private boolean unread = true;

    @Column(name = "deleted")
    private boolean deleted = false;

    @Column(name = "emailed")
    private boolean emailed = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", length = 10)
    private Level level = Level.info;

    @Column(name = "redirect", length = 255)
    private String redirect;

    @Column(name = "icon", length = 50)
    private String icon;
}
```

---

## 19. Security Configuration

### SecurityConfig.java
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthFilter jwtAuthFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/api/docs/**",
                                 "/api/swagger-ui/**", "/login").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## 20. Repository Layer (all modules)

Each entity gets a Spring Data JPA repository. Company-scoped queries use `JpaSpecificationExecutor`:

```java
// Pattern for every module repository:
public interface EmployeeRepository
    extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByEmail(String email);
    List<Employee> findByWorkInformation_Company_Id(Long companyId);
    boolean existsByEmail(String email);
}

public interface AttendanceRepository
    extends JpaRepository<Attendance, Long>, JpaSpecificationExecutor<Attendance> {

    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate date);
    List<Attendance> findByEmployee_WorkInformation_Company_IdAndAttendanceDate(
        Long companyId, LocalDate date);
}

// ... same pattern for all modules
```

---

## 21. Service Layer (Business Logic)

### Key service responsibilities per module:

| Module | Core Service Logic |
|--------|--------------------|
| **Employee** | Auto-create User on Employee create; auto-create BonusPoint; auto-create WorkInformation |
| **Attendance** | Clock in/out; calculate worked hours from activities; overtime calc; validate attendance |
| **Leave** | Deduct AvailableLeave on approval; carry-forward on reset; compensatory leave handling |
| **Payroll** | Generate payslip with snapshot of all pay heads; contract wage calculations |
| **Recruitment** | Stage pipeline progression; candidate conversion to employee |
| **Onboarding** | Auto-create "Initial" stage on Recruitment create; task completion tracking |
| **Offboarding** | Auto-create 5 default stages on Offboarding create; notice period calculation |
| **PMS** | OKR progress tracking; key result current value updates |
| **Asset** | Status transitions (Available → In Use → Returned); expiry notifications |
| **Project** | Auto-create "Todo" stage on project create; task status expiry |
| **Notification** | Multi-language verb storage; mark-read; soft-delete |

### Event-driven (replaces Django signals):
```java
// EmployeeCreatedEvent published in EmployeeService.create()
// Handlers in: BonusPointEventHandler, UserCreationEventHandler, WorkInfoEventHandler

// RecruitmentCreatedEvent → OnboardingStageEventHandler (creates "Initial" stage)
// OffboardingCreatedEvent → OffboardingStageEventHandler (creates 5 default stages)
// LeaveRequestApprovedEvent → AvailableLeaveDeductionHandler
// ProjectCreatedEvent → ProjectStageEventHandler (creates "Todo" stage)
```

---

## 22. Controller Layer — REST API Endpoints

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Base / Configuration
```
GET/POST         /api/companies
GET/PUT/DELETE   /api/companies/{id}
GET/POST         /api/departments
GET/POST         /api/job-positions
GET/POST         /api/job-roles
GET/POST         /api/work-types
GET/POST         /api/employee-types
GET/POST         /api/shifts
GET/POST         /api/shift-schedules
GET/POST         /api/holidays
GET/POST         /api/company-leaves
GET/POST         /api/mail-templates
GET              /api/tags
```

### Employee
```
GET/POST         /api/employees
GET/PUT/DELETE   /api/employees/{id}
GET/PUT          /api/employees/{id}/work-info
GET/PUT          /api/employees/{id}/bank-details
GET/POST         /api/employees/{id}/notes
POST             /api/employees/{id}/archive
GET/POST         /api/disciplinary-actions
GET/POST         /api/policies
GET/POST         /api/bonus-points
```

### Attendance
```
GET/POST         /api/attendances
GET/PUT          /api/attendances/{id}
POST             /api/attendances/clock-in
POST             /api/attendances/clock-out
POST             /api/attendances/{id}/validate
POST             /api/attendances/{id}/approve-overtime
GET              /api/attendance-activities
GET              /api/attendance-overtime
GET              /api/grace-times
POST             /api/grace-times
```

### Leave
```
GET/POST         /api/leave-types
GET/POST         /api/leave-requests
GET/PUT          /api/leave-requests/{id}
POST             /api/leave-requests/{id}/approve
POST             /api/leave-requests/{id}/reject
GET/POST         /api/leave-allocations
GET              /api/available-leaves
GET/POST         /api/holidays
GET/POST         /api/company-leaves
```

### Payroll
```
GET/POST         /api/contracts
GET/PUT          /api/contracts/{id}
GET/POST         /api/filing-statuses
GET/POST         /api/allowances
GET/POST         /api/deductions
GET/POST         /api/payslips
POST             /api/payslips/generate
GET              /api/payslips/{id}/pdf
POST             /api/payslips/{id}/confirm
```

### Recruitment
```
GET/POST         /api/recruitments
GET/PUT/DELETE   /api/recruitments/{id}
GET/POST         /api/stages
GET/POST         /api/candidates
GET/PUT          /api/candidates/{id}
POST             /api/candidates/{id}/move-stage
POST             /api/candidates/{id}/convert-to-employee
GET/POST         /api/survey-templates
GET/POST         /api/skills
```

### Onboarding
```
GET/POST         /api/onboarding-stages
GET/POST         /api/onboarding-tasks
GET              /api/candidate-stages
PUT              /api/candidate-stages/{id}
GET/PUT          /api/candidate-tasks/{id}
```

### Offboarding
```
GET/POST         /api/offboardings
GET/PUT          /api/offboarding-stages
GET/POST         /api/offboarding-employees
POST             /api/resignation-letters
GET/POST         /api/offboarding-tasks
GET/PUT          /api/employee-tasks
```

### PMS
```
GET/POST         /api/periods
GET/POST         /api/key-results
GET/POST         /api/objectives
GET/POST         /api/employee-objectives
GET/PUT          /api/employee-key-results/{id}
```

### Asset
```
GET/POST         /api/asset-categories
GET/POST         /api/asset-lots
GET/POST         /api/assets
GET/PUT/DELETE   /api/assets/{id}
GET/POST         /api/asset-assignments
POST             /api/asset-assignments/{id}/return
GET/POST         /api/asset-requests
POST             /api/asset-requests/{id}/approve
POST             /api/asset-requests/{id}/reject
```

### Helpdesk
```
GET/POST         /api/ticket-types
GET/POST         /api/tickets
GET/PUT          /api/tickets/{id}
POST             /api/tickets/{id}/resolve
GET/POST         /api/ticket-comments
GET/POST         /api/faq-categories
GET/POST         /api/faqs
```

### Project
```
GET/POST         /api/projects
GET/PUT/DELETE   /api/projects/{id}
GET/POST         /api/project-stages
GET/POST         /api/tasks
GET/PUT/DELETE   /api/tasks/{id}
GET/POST         /api/timesheets
```

### Notifications
```
GET              /api/notifications
POST             /api/notifications/{id}/read
POST             /api/notifications/read-all
DELETE           /api/notifications/{id}
```

---

## 23. Scheduled Jobs (`@Scheduled` / Quartz)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `RotatingShiftJob` | Daily midnight | Rotate employee shifts per `RotatingShiftAssign` |
| `RotatingWorkTypeJob` | Daily midnight | Rotate work types |
| `LeaveResetJob` | Daily 00:05 | Reset `AvailableLeave` when `reset_date` reached |
| `AssetExpiryNotificationJob` | Daily 08:00 | Notify `notify_before` days before expiry |
| `ContractExpiryJob` | Daily 08:00 | Alert on contract end dates approaching |
| `AttendanceOvertimeJob` | Daily 23:55 | Aggregate monthly overtime |

---

## 24. Implementation Order

```
Step 1  →  pom.xml + application.properties
Step 2  →  BaseEntity, CompanyContext, CompanyInterceptor, SecurityConfig, JwtTokenProvider
Step 3  →  base module entities → repositories → services → controllers
Step 4  →  employee module (depends on base)
Step 5  →  attendance module (depends on employee, base)
Step 6  →  leave module (depends on employee, base)
Step 7  →  payroll module (depends on employee, leave, attendance)
Step 8  →  recruitment module (depends on employee, base)
Step 9  →  onboarding module (depends on recruitment)
Step 10 →  offboarding module (depends on employee, payroll)
Step 11 →  pms module (depends on employee, base)
Step 12 →  asset module (depends on employee, base)
Step 13 →  helpdesk module (depends on employee, base)
Step 14 →  project module (depends on employee, base)
Step 15 →  notification module (depends on all)
Step 16 →  automation module (depends on mail, notification)
Step 17 →  scheduled jobs (all modules)
Step 18 →  REST controllers + DTOs + MapStruct mappers
Step 19 →  File upload service (multipart → media/)
Step 20 →  Excel + PDF export services
```

---

## 25. Docker Setup

### `docker-compose.yaml`
```yaml
version: "3.8"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: horilla
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - horilla-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/horilla
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
    volumes:
      - ./media:/app/media
    depends_on:
      db:
        condition: service_healthy

volumes:
  horilla-data:
```

### `Dockerfile`
```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/demo-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

*All entities, fields, relationships, and business rules sourced directly from the Horilla HRMS Django codebase. Every Django field type mapped to its exact Java/JPA equivalent.*
