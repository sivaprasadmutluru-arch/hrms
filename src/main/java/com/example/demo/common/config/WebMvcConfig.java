package com.example.demo.common.config;

import com.example.demo.common.interceptor.AccessScopeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers HTTP interceptors.
 *
 * AccessScopeInterceptor runs on every /api/** request and:
 *   1. Reads X-Company-Id header
 *   2. Determines the user's access scope (SELF, BRANCH, ENTERPRISE, etc.)
 *   3. Builds the list of company IDs the user can access
 *   4. Stores everything in AccessScopeContext (thread-local) for services to use
 *
 * The old CompanyInterceptor is replaced by AccessScopeInterceptor,
 * which also sets CompanyContext internally for backward compatibility.
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AccessScopeInterceptor accessScopeInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(accessScopeInterceptor).addPathPatterns("/api/**");
    }
}
