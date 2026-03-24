package com.example.demo.common.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Kept for backward compatibility but no longer active.
 *
 * Company context is now set by AccessScopeInterceptor, which also
 * calls CompanyContext.set() internally. AccessScopeInterceptor is
 * registered in WebMvcConfig instead of this one.
 */
@Component
public class CompanyInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        // Replaced by AccessScopeInterceptor
        return true;
    }
}
