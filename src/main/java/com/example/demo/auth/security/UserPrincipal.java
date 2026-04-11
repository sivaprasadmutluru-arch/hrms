package com.example.demo.auth.security;

import com.example.demo.auth.entity.Permission;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Spring Security's representation of an authenticated user.
 *
 * Authorities loaded here are used by @PreAuthorize checks:
 *   hasRole('BRANCH_ADMIN')      → checks for "ROLE_BRANCH_ADMIN" authority
 *   hasAuthority('leave:approve') → checks for "leave:approve" authority
 *
 * Note: This loads all roles from all companies the user belongs to.
 * Fine-grained data filtering (which company's data they can see) is handled
 * separately by AccessScopeInterceptor at request time.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String email;
    private final String password;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this(user, List.of());
    }

    /**
     * Constructor used for PLATFORM_SUPER_ADMIN — passes all system permissions
     * so that every hasAuthority() check passes automatically.
     */
    public UserPrincipal(User user, List<Permission> allPermissions) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.active = user.isActive();

        List<GrantedAuthority> auths = new ArrayList<>();

        // Add ROLE_ prefix for each role the user has (used with hasRole())
        // Add permission strings directly (used with hasAuthority())
        user.getUserRoles().forEach(ur -> {
            auths.add(new SimpleGrantedAuthority("ROLE_" + ur.getRole().getName().name()));
            ur.getRole().getPermissions().forEach(p ->
                    auths.add(new SimpleGrantedAuthority(p.getName())));
        });

        // Platform Super Admin (isSuperuser flag) always gets the top-level role
        // plus every permission in the system so all hasAuthority() checks pass.
        if (user.isSuperuser()) {
            auths.add(new SimpleGrantedAuthority("ROLE_" + Role.RoleName.PLATFORM_SUPER_ADMIN.name()));
            allPermissions.forEach(p ->
                    auths.add(new SimpleGrantedAuthority(p.getName())));
        }

        // Remove duplicates (a user might have the same role in multiple companies)
        this.authorities = auths.stream().distinct().collect(Collectors.toList());
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return active; }
}
