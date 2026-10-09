package com.example.demo.base.dto;

import com.example.demo.base.entity.Organization;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Response for organization creation — includes the auto-created Head Office's
 * company id alongside the organization itself, so the frontend can immediately
 * switch the active org context (X-Company-Id) to the new org without a follow-up
 * lookup. Returning just the bare Organization here previously left the frontend
 * with no way to do this, so newly created orgs stayed unselected until the user
 * manually picked them from the org switcher — see OrganizationsPage.jsx.
 */
@Getter
@AllArgsConstructor
public class CreateOrganizationResponse {
    private Organization organization;
    private Long headOfficeCompanyId;
    private boolean headOfficeSchemaReady;
}
