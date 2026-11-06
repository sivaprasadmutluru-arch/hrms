package com.example.demo.search.service;

import com.example.demo.asset.entity.Asset;
import com.example.demo.asset.repository.AssetRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.base.entity.JobPosition;
import com.example.demo.base.entity.JobRole;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.base.repository.JobPositionRepository;
import com.example.demo.base.repository.JobRoleRepository;
import com.example.demo.documents.entity.GeneratedLetter;
import com.example.demo.documents.repository.GeneratedLetterRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.helpdesk.entity.Ticket;
import com.example.demo.helpdesk.repository.TicketRepository;
import com.example.demo.project.entity.Project;
import com.example.demo.project.repository.ProjectRepository;
import com.example.demo.recruitment.entity.RecruitmentPost;
import com.example.demo.recruitment.repository.RecruitmentPostRepository;
import com.example.demo.search.dto.SearchResultDto;
import com.example.demo.search.dto.SearchResultDto.SearchItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final TicketRepository ticketRepository;
    private final AssetRepository assetRepository;
    private final ProjectRepository projectRepository;
    private final RecruitmentPostRepository recruitmentPostRepository;
    private final GeneratedLetterRepository generatedLetterRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public SearchResultDto search(String query, Long companyId, UserPrincipal user, String filterType) {
        if (query == null || query.trim().length() < 2) {
            return SearchResultDto.builder()
                    .query(query)
                    .totalMatches(0)
                    .items(List.of())
                    .build();
        }

        String q = query.trim().toLowerCase();
        List<SearchItem> items = new ArrayList<>();

        boolean isPlatformAdmin = user != null && user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN")
                        || a.getAuthority().equals("ROLE_PLATFORM_ORGANIZATION_OPERATIONS"));
        boolean isSuperAdmin = user != null && user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));

        boolean matchAll = filterType == null || filterType.isBlank() || "all".equalsIgnoreCase(filterType);

        // 1. Employees (accessible if employee:view or active user)
        if (matchAll || "employees".equalsIgnoreCase(filterType)) {
            try {
                List<Employee> emps;
                if (companyId != null) {
                    emps = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
                } else if (isPlatformAdmin) {
                    emps = employeeRepository.findAll(PageRequest.of(0, 50)).getContent();
                } else {
                    emps = List.of();
                }

                int count = 0;
                for (Employee e : emps) {
                    if (count >= 8) break;
                    String fullName = (e.getFirstName() + " " + (e.getLastName() != null ? e.getLastName() : "")).trim();
                    String email = e.getEmail() != null ? e.getEmail() : "";
                    String badge = e.getBadgeId() != null ? e.getBadgeId() : "";
                    String dept = e.getDepartment() != null ? e.getDepartment().getName() : "";
                    String pos = e.getJobPosition() != null ? e.getJobPosition().getName() : "";

                    boolean matches = fullName.toLowerCase().contains(q)
                            || email.toLowerCase().contains(q)
                            || badge.toLowerCase().contains(q)
                            || dept.toLowerCase().contains(q)
                            || pos.toLowerCase().contains(q);

                    if (matches) {
                        String subtitle = List.of(badge, dept, pos).stream()
                                .filter(s -> !s.isBlank())
                                .reduce((a, b) -> a + " · " + b)
                                .orElse("Employee");

                        items.add(SearchItem.builder()
                                .id("emp-" + e.getId())
                                .type("employee")
                                .category("Employees")
                                .title(fullName.isBlank() ? email : fullName)
                                .subtitle(subtitle)
                                .badge(badge)
                                .path("/employees/" + e.getId())
                                .status(e.isActive() ? "Active" : "Inactive")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching employees: {}", ex.getMessage());
            }
        }

        // 2. Departments
        if (matchAll || "departments".equalsIgnoreCase(filterType) || "org".equalsIgnoreCase(filterType)) {
            try {
                List<Department> depts = companyId != null
                        ? departmentRepository.findByCompanyId(companyId)
                        : departmentRepository.findAll();

                int count = 0;
                for (Department d : depts) {
                    if (count >= 5) break;
                    if (d.getName() != null && d.getName().toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("dept-" + d.getId())
                                .type("department")
                                .category("Departments")
                                .title(d.getName())
                                .subtitle(d.getCompany() != null ? d.getCompany().getName() : "Department")
                                .path("/departments")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching departments: {}", ex.getMessage());
            }
        }

        // 3. Job Positions & Roles
        if (matchAll || "positions".equalsIgnoreCase(filterType) || "org".equalsIgnoreCase(filterType)) {
            try {
                List<JobPosition> positions = companyId != null
                        ? jobPositionRepository.findByCompanyId(companyId)
                        : jobPositionRepository.findAll();

                int count = 0;
                for (JobPosition jp : positions) {
                    if (count >= 5) break;
                    if (jp.getName() != null && jp.getName().toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("pos-" + jp.getId())
                                .type("position")
                                .category("Designations")
                                .title(jp.getName())
                                .subtitle("Job Position")
                                .path("/job-positions")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching job positions: {}", ex.getMessage());
            }
        }

        // 4. Helpdesk Tickets
        if (matchAll || "helpdesk".equalsIgnoreCase(filterType) || "tickets".equalsIgnoreCase(filterType)) {
            try {
                List<Ticket> tickets = companyId != null
                        ? ticketRepository.findByCompanyId(companyId)
                        : (isPlatformAdmin ? ticketRepository.findAll() : List.of());

                int count = 0;
                for (Ticket t : tickets) {
                    if (count >= 5) break;
                    String title = t.getTitle() != null ? t.getTitle() : "";
                    String desc = t.getDescription() != null ? t.getDescription() : "";
                    String ticketNum = "TICK-" + t.getId();

                    if (title.toLowerCase().contains(q) || desc.toLowerCase().contains(q) || ticketNum.toLowerCase().contains(q)) {
                        String statusStr = t.getStatus() != null ? t.getStatus().name() : "OPEN";
                        String prioStr = t.getPriority() != null ? t.getPriority().name() : "MEDIUM";
                        items.add(SearchItem.builder()
                                .id("ticket-" + t.getId())
                                .type("ticket")
                                .category("Helpdesk")
                                .title(title)
                                .subtitle(ticketNum + " · Priority: " + prioStr)
                                .status(statusStr)
                                .badge(ticketNum)
                                .path("/helpdesk")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching tickets: {}", ex.getMessage());
            }
        }

        // 5. Assets
        if (matchAll || "assets".equalsIgnoreCase(filterType)) {
            try {
                List<Asset> assets = companyId != null
                        ? assetRepository.findByCompanyId(companyId)
                        : (isPlatformAdmin ? assetRepository.findAll() : List.of());

                int count = 0;
                for (Asset a : assets) {
                    if (count >= 5) break;
                    String name = a.getAssetName() != null ? a.getAssetName() : "";
                    String assetId = a.getAssetId() != null ? a.getAssetId() : "";
                    String desc = a.getDescription() != null ? a.getDescription() : "";

                    if (name.toLowerCase().contains(q) || assetId.toLowerCase().contains(q) || desc.toLowerCase().contains(q)) {
                        String catName = a.getCategory() != null ? a.getCategory().getName() : "Asset";
                        items.add(SearchItem.builder()
                                .id("asset-" + a.getId())
                                .type("asset")
                                .category("Assets")
                                .title(name)
                                .subtitle(catName + (assetId.isBlank() ? "" : " · " + assetId))
                                .badge(assetId)
                                .status(a.getStatus() != null ? a.getStatus().name() : null)
                                .path("/assets")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching assets: {}", ex.getMessage());
            }
        }

        // 6. Projects
        if (matchAll || "projects".equalsIgnoreCase(filterType)) {
            try {
                List<Project> projects = companyId != null
                        ? projectRepository.findByCompanyId(companyId)
                        : (isPlatformAdmin ? projectRepository.findAll() : List.of());

                int count = 0;
                for (Project p : projects) {
                    if (count >= 5) break;
                    String title = p.getTitle() != null ? p.getTitle() : "";
                    String desc = p.getDescription() != null ? p.getDescription() : "";

                    if (title.toLowerCase().contains(q) || desc.toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("project-" + p.getId())
                                .type("project")
                                .category("Projects")
                                .title(title)
                                .subtitle("Status: " + (p.getStatus() != null ? p.getStatus().name() : "Active"))
                                .path("/projects")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching projects: {}", ex.getMessage());
            }
        }

        // 7. Recruitment Posts
        if (matchAll || "recruitment".equalsIgnoreCase(filterType)) {
            try {
                List<RecruitmentPost> posts = companyId != null
                        ? recruitmentPostRepository.findByCompanyId(companyId)
                        : (isPlatformAdmin ? recruitmentPostRepository.findAll() : List.of());

                int count = 0;
                for (RecruitmentPost rp : posts) {
                    if (count >= 5) break;
                    String name = rp.getName() != null ? rp.getName() : "";
                    String pos = rp.getJobPosition() != null ? rp.getJobPosition().getName() : "";

                    if (name.toLowerCase().contains(q) || pos.toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("rec-post-" + rp.getId())
                                .type("recruitment")
                                .category("Recruitment")
                                .title(name)
                                .subtitle(pos.isBlank() ? "Job Opening" : pos)
                                .path("/recruitment/posts")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching recruitment: {}", ex.getMessage());
            }
        }

        // 8. Letters & Documents
        if (matchAll || "documents".equalsIgnoreCase(filterType)) {
            try {
                List<GeneratedLetter> letters = companyId != null
                        ? generatedLetterRepository.findByCompanyId(companyId)
                        : (isPlatformAdmin ? generatedLetterRepository.findAll() : List.of());

                int count = 0;
                for (GeneratedLetter gl : letters) {
                    if (count >= 5) break;
                    String title = gl.getTitle() != null ? gl.getTitle() : "";
                    String ref = gl.getReferenceNumber() != null ? gl.getReferenceNumber() : "";
                    String type = gl.getLetterType() != null ? gl.getLetterType().name() : "";

                    if (title.toLowerCase().contains(q) || ref.toLowerCase().contains(q) || type.toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("doc-letter-" + gl.getId())
                                .type("document")
                                .category("Documents")
                                .title(title)
                                .subtitle("Ref: " + ref + " · " + type)
                                .badge(ref)
                                .status(gl.getStatus() != null ? gl.getStatus().name() : null)
                                .path("/documents/letters")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching letters: {}", ex.getMessage());
            }
        }

        // 9. Companies & Branches (for Platform/Super Admins)
        if ((isPlatformAdmin || isSuperAdmin) && (matchAll || "companies".equalsIgnoreCase(filterType))) {
            try {
                List<Company> companies = companyRepository.findAll();
                int count = 0;
                for (Company c : companies) {
                    if (count >= 5) break;
                    String name = c.getName() != null ? c.getName() : "";
                    String city = c.getCity() != null ? c.getCity() : "";
                    String country = c.getCountry() != null ? c.getCountry() : "";

                    if (name.toLowerCase().contains(q) || city.toLowerCase().contains(q) || country.toLowerCase().contains(q)) {
                        items.add(SearchItem.builder()
                                .id("company-" + c.getId())
                                .type("company")
                                .category("Companies")
                                .title(name)
                                .subtitle(List.of(city, country).stream().filter(s -> !s.isBlank()).reduce((a, b) -> a + ", " + b).orElse("Branch"))
                                .path("/companies")
                                .build());
                        count++;
                    }
                }
            } catch (Exception ex) {
                log.warn("Error searching companies: {}", ex.getMessage());
            }
        }

        return SearchResultDto.builder()
                .query(query)
                .totalMatches(items.size())
                .items(items)
                .build();
    }
}
