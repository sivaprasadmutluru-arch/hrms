package com.example.demo.employee.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.service.AuthService;
import com.example.demo.auth.service.UserRoleService;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.dto.EmployeeRequest;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final UserRoleService userRoleService;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;

    /**
     * Lists employees visible to the current user based on their access scope.
     *   SELF scope        → only the employee record linked to the current user
     *   DEPARTMENT scope  → only employees in the user's department
     *   BRANCH scope      → all employees in the branch
     *   ENTERPRISE scope  → all employees across HO + all branches
     */
    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAll(Pageable pageable) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();

        // SELF scope: return only the employee record linked to the current user
        if (scope != null && scope.isSelfScope()) {
            return employeeRepository.findByUserId(scope.getUserId())
                    .map(e -> (Page<EmployeeResponse>) new PageImpl<>(
                            Collections.singletonList(EmployeeResponse.from(e)), pageable, 1))
                    .orElse(Page.empty(pageable));
        }

        // DEPARTMENT scope: only employees in the user's department
        // Other scopes: company-level filter
        Specification<Employee> spec = ScopeFilter.byDepartmentOrCompany();
        Page<Employee> page = spec != null
                ? employeeRepository.findAll(spec, pageable)
                : employeeRepository.findAll(pageable);
        return page.map(EmployeeResponse::from);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getById(Long id) {
        return EmployeeResponse.from(findEmployee(id));
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest req) {
        if (req.getEmail() != null && employeeRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BadRequestException("Employee with this email already exists");
        }

        // Check subscription plan employee limit before creating
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));
        Organization org = company.getOrganization();
        if (org != null && org.getSubscriptionPlan() != null) {
            int planMaxEmployees = org.getSubscriptionPlan().getMaxEmployees();
            if (planMaxEmployees != Integer.MAX_VALUE) {
                List<Company> orgCompanies = companyRepository.findByOrganizationId(org.getId());
                long currentCount = orgCompanies.stream()
                        .mapToLong(c -> employeeRepository.findByCompanyIdAndIsActiveTrue(c.getId()).size())
                        .sum();
                if (currentCount >= planMaxEmployees) {
                    throw new BadRequestException(
                            "Employee limit of " + planMaxEmployees + " reached for subscription plan '"
                            + org.getSubscriptionPlan().name() + "'. Upgrade your plan to add more employees.");
                }
            }
        }

        Employee emp = buildEmployee(new Employee(), req);
        if (emp.getBadgeId() == null || emp.getBadgeId().isBlank()) {
            emp.setBadgeId(generateBadgeId(company.getId(), company.getName()));
        }

        // Auto-create a linked user account if email is provided
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            boolean[] isNewUser = {false};
            User user = userRepository.findByEmail(req.getEmail()).orElseGet(() -> {
                isNewUser[0] = true;
                RegisterRequest reg = new RegisterRequest();
                reg.setUsername(req.getEmail());
                reg.setEmail(req.getEmail());
                reg.setPassword(req.getPassword() != null && !req.getPassword().isBlank()
                        ? req.getPassword() : "hrms@1234");
                reg.setFirstName(req.getFirstName());
                reg.setLastName(req.getLastName());
                reg.setCompanyId(null); // role assignment handled explicitly below
                return authService.register(reg);
            });
            emp.setUser(user);

            // Assign role: use selected role, or default to EMPLOYEE+SELF for new users
            Role.RoleName roleName = req.getRole() != null ? req.getRole() : (isNewUser[0] ? Role.RoleName.EMPLOYEE : null);
            UserRole.AccessScope scope = req.getAccessScope() != null ? req.getAccessScope() : (isNewUser[0] ? UserRole.AccessScope.SELF : null);
            if (roleName != null && scope != null && !userRoleService.hasRole(user.getId(), req.getCompanyId(), roleName)) {
                AssignRoleRequest roleReq = new AssignRoleRequest();
                roleReq.setUserId(user.getId());
                roleReq.setRoleName(roleName);
                roleReq.setCompanyId(req.getCompanyId());
                roleReq.setAccessScope(scope);
                userRoleService.assignRole(roleReq);
            }
        }

        return EmployeeResponse.from(employeeRepository.save(emp));
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest req) {
        Employee emp = findEmployee(id);
        buildEmployee(emp, req);
        // Link to user account if not already linked and email is provided
        if (emp.getUser() == null && req.getEmail() != null && !req.getEmail().isBlank()) {
            userRepository.findByEmail(req.getEmail()).ifPresent(emp::setUser);
        }
        return EmployeeResponse.from(employeeRepository.save(emp));
    }

    @Transactional
    public void delete(Long id) {
        Employee emp = findEmployee(id);
        emp.setActive(false);
        employeeRepository.save(emp);
    }

    @Transactional
    public String uploadPhoto(Long id, MultipartFile file) throws IOException {
        Employee emp = findEmployee(id);
        String dir = "./media/employees/photos";
        Files.createDirectories(Paths.get(dir));
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path target = Paths.get(dir, filename);
        Files.copy(file.getInputStream(), target);
        emp.setPhotoPath("/media/employees/photos/" + filename);
        employeeRepository.save(emp);
        return emp.getPhotoPath();
    }

    public List<EmployeeResponse> getByDepartment(Long departmentId) {
        return employeeRepository.findByDepartmentId(departmentId)
                .stream().map(EmployeeResponse::from).collect(Collectors.toList());
    }

    private String generateBadgeId(Long companyId, String companyName) {
        String code = companyCode(companyName);
        long base = employeeRepository.countByCompanyId(companyId);
        for (int i = 0; i < 1000; i++) {
            String candidate = String.format("EMP-%s-%03d", code, base + 1 + i);
            if (employeeRepository.findByBadgeId(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "EMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String companyCode(String name) {
        String[] words = name.trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        for (String w : words) {
            if (code.length() >= 3) break;
            if (!w.isEmpty()) code.append(Character.toUpperCase(w.charAt(0)));
        }
        while (code.length() < 3) code.append('X');
        return code.toString();
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
    }

    private Employee buildEmployee(Employee emp, EmployeeRequest req) {
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));
        emp.setCompany(company);
        emp.setFirstName(req.getFirstName());
        emp.setLastName(req.getLastName());
        emp.setBadgeId(req.getBadgeId());
        emp.setPhone(req.getPhone());
        emp.setEmail(req.getEmail());
        emp.setGender(req.getGender());
        emp.setDateOfBirth(req.getDateOfBirth());
        emp.setMaritalStatus(req.getMaritalStatus());
        emp.setNationality(req.getNationality());
        emp.setCountryOfBirth(req.getCountryOfBirth());
        emp.setPlaceOfBirth(req.getPlaceOfBirth());
        emp.setPermanentAddress(req.getPermanentAddress());
        emp.setCurrentAddress(req.getCurrentAddress());
        emp.setCountry(req.getCountry());
        emp.setState(req.getState());
        emp.setCity(req.getCity());
        emp.setZip(req.getZip());
        emp.setWorkEmail(req.getWorkEmail());
        emp.setWorkPhone(req.getWorkPhone());
        emp.setQualification(req.getQualification());
        emp.setExperience(req.getExperience());
        emp.setChildren(req.getChildren());
        emp.setEmergencyContact(req.getEmergencyContact());
        emp.setEmergencyContactName(req.getEmergencyContactName());
        emp.setEmergencyContactRelation(req.getEmergencyContactRelation());
        emp.setDateJoining(req.getDateJoining());
        emp.setEmployeeType(req.getEmployeeType());
        if (req.getDepartmentId() != null) emp.setDepartment(departmentRepository.findById(req.getDepartmentId()).orElse(null));
        if (req.getJobPositionId() != null) emp.setJobPosition(jobPositionRepository.findById(req.getJobPositionId()).orElse(null));
        if (req.getJobRoleId() != null) emp.setJobRole(jobRoleRepository.findById(req.getJobRoleId()).orElse(null));
        if (req.getWorkTypeId() != null) emp.setWorkType(workTypeRepository.findById(req.getWorkTypeId()).orElse(null));
        if (req.getShiftId() != null) emp.setShift(shiftScheduleRepository.findById(req.getShiftId()).orElse(null));
        if (req.getReportingManagerId() != null) emp.setReportingManager(employeeRepository.findById(req.getReportingManagerId()).orElse(null));
        if (req.getIsActive() != null) emp.setActive(req.getIsActive());
        return emp;
    }
}
