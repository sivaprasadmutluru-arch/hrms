package com.example.demo.auth.repository;

import com.example.demo.auth.entity.User;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserLoginLookupTest {
    @Test void emailLookupUsesNormalizedQueryAfterExactUsernameLookup() {
        UserRepository repository = mock(UserRepository.class, CALLS_REAL_METHODS);
        User user = new User();
        user.setUsername("971529866896");
        user.setEmail("Vidisha@pioneerinsurance.ae");
        when(repository.findByUsername("vidisha@pioneerinsurance.ae")).thenReturn(Optional.empty());
        when(repository.findByNormalizedEmail("vidisha@pioneerinsurance.ae")).thenReturn(Optional.of(user));
        assertSame(user, repository.findForLogin("  vidisha@pioneerinsurance.ae  ").orElseThrow());
    }

    @Test void preservesExactUsernameAndDoesNotFallBackToEmail() {
        UserRepository repository = mock(UserRepository.class, CALLS_REAL_METHODS);
        User user = new User();
        when(repository.findByUsername("971529866896")).thenReturn(Optional.of(user));
        assertSame(user, repository.findForLogin("971529866896").orElseThrow());
        verify(repository, never()).findByNormalizedEmail(anyString());
    }

    @Test void blankIdentifiersDoNotQueryUsers() {
        UserRepository repository = mock(UserRepository.class, CALLS_REAL_METHODS);
        assertTrue(repository.findForLogin(null).isEmpty());
        assertTrue(repository.findForLogin("  ").isEmpty());
        verify(repository, never()).findByUsername(anyString());
        verify(repository, never()).findByNormalizedEmail(anyString());
    }
}
