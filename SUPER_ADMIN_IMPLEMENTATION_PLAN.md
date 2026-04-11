# Super Admin Features — Frontend Implementation Plan

**Stack**: React 19 + Redux Toolkit + Axios + Tailwind CSS + Headless UI + React Hook Form
**Pattern**: Feature slice → async thunk → Redux store → component with `useDispatch/useSelector`
**Auth guard**: `<ProtectedRoute roles={[...]} />` + `useAuth()` hook inside components
**API client**: `src/services/api.js` (auto-injects Bearer token + X-Company-Id header)

---

## Feature Groups

1. [Auth & Account Settings](#1-auth--account-settings)
2. [Two-Factor Authentication (2FA)](#2-two-factor-authentication-2fa)
3. [User Groups & Permission Overrides](#3-user-groups--permission-overrides)
4. [General Settings (Date/Time, White Label, Dashboard)](#4-general-settings)
5. [Shift Allocations](#5-shift-allocations)
6. [Rotating Shift & Work Type Assigns](#6-rotating-shift--work-type-assigns)
7. [Shift & Work Type Request Bulk Ops + Export](#7-shift--work-type-request-bulk-ops--export)
8. [Holiday Import / Export](#8-holiday-import--export)
9. [Employee Work-Info Import / Export + Bulk Update](#9-employee-work-info-import--export--bulk-update)
10. [Encashment Conditions](#10-encashment-conditions)
11. [Notification Delete](#11-notification-delete)
12. [Audit Tags & Helpdesk Tags](#12-audit-tags--helpdesk-tags)
13. [Account Block/Unblock Feature Toggle](#13-account-blockUnblock-feature-toggle)
14. [Platform Company Scope Selector](#14-platform-company-scope-selector)

---

## 1. Auth & Account Settings

**Backend endpoints**
- `POST /api/auth/change-username` — body `{ newUsername }`
- `POST /api/auth/change-password` — body `{ currentPassword, newPassword }`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/auth/authSlice.js` | Add `changeUsername` and `changePassword` async thunks |
| `src/features/auth/AccountSettingsPage.jsx` | New page — two sections: Change Username form, Change Password form |
| `src/App.jsx` | Add route `/settings/account` under `<AppLayout>` |
| `src/components/layout/Sidebar.jsx` | Add "Account Settings" link under user menu or settings section |

**Implementation notes**
- `changePassword` form: 3 fields — Current Password, New Password, Confirm New Password (validate match client-side with React Hook Form `watch`)
- `changeUsername` form: 1 field — New Username, with the current username shown as read-only hint
- Both forms should show success toast and on `changeUsername` update the stored user object in Redux + localStorage
- Protect route with all authenticated roles (no role restriction — every user can change their own credentials)

---

## 2. Two-Factor Authentication (2FA)

**Backend endpoints**
- `GET /api/2fa/status` — `{ isEnabled, otpVerified }`
- `POST /api/2fa/setup` — generates OTP, returns `{ message, otp }` (dev mode)
- `POST /api/2fa/send-otp` — re-send OTP
- `POST /api/2fa/verify` — body `{ otp }` → enables 2FA
- `POST /api/2fa/disable` — body `{ otp }` → disables 2FA
- `GET /api/2fa/admin/user/{userId}` — admin check (PLATFORM_SUPER_ADMIN only)
- `POST /api/2fa/admin/user/{userId}/disable` — force-disable (PLATFORM_SUPER_ADMIN only)

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/auth/twoFactorSlice.js` | New slice — state: `{ status, loading, error }` |
| `src/features/auth/TwoFactorSetupPage.jsx` | New page — setup wizard (3 steps: trigger → enter OTP → confirmed) |
| `src/features/auth/AccountSettingsPage.jsx` | Add a 2FA section card with current status + Enable/Disable button |
| `src/app/store.js` | Register `twoFactorReducer` |

**UI flow**
```
[2FA Status Card]
  If disabled → "Enable 2FA" button
    → POST /api/2fa/setup (show OTP in dev, in prod "OTP sent to your email")
    → OTP input field + "Verify" button
    → POST /api/2fa/verify → success state, card updates to "Enabled"
  If enabled → "Disable 2FA" button
    → OTP input field appears inline
    → POST /api/2fa/disable → card updates to "Disabled"
```

**Admin panel** (within user detail page or a separate tab)
- Show 2FA status badge next to each user
- "Force Disable" button → `POST /api/2fa/admin/user/{userId}/disable`
- Visible only to `PLATFORM_SUPER_ADMIN`

---

## 3. User Groups & Permission Overrides

### User Groups

**Backend endpoints**
- `GET /api/user-groups?companyId=` — list groups
- `GET /api/user-groups/{id}` — single group
- `POST /api/user-groups` — create
- `PUT /api/user-groups/{id}` — update
- `DELETE /api/user-groups/{id}` — delete
- `GET /api/user-groups/{id}/members` — list members
- `POST /api/user-groups/{id}/members/{userId}` — add member
- `DELETE /api/user-groups/{id}/members/{userId}` — remove member
- `POST /api/user-groups/{id}/members/bulk-assign` — body `{ userIds: [] }`
- `GET /api/user-groups/user/{userId}` — groups for a user

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/roles/userGroupsSlice.js` | New slice |
| `src/features/roles/UserGroupsPage.jsx` | New page — list of groups with CRUD |
| `src/features/roles/UserGroupFormModal.jsx` | Create/edit modal — name, description, permissions (multi-select or comma-separated textarea) |
| `src/features/roles/UserGroupMembersModal.jsx` | Members management — list + add/remove + bulk assign |
| `src/App.jsx` | Add route `/roles/user-groups` |
| `src/components/layout/Sidebar.jsx` | Add link under Roles/Settings section |

**Permissions multi-select**: Render a predefined list of permission codes as checkboxes (e.g., `attendance:view`, `leave:approve`, `payroll:view`). Store as comma-separated string. Pull the full list from `src/config/constants.js` — add a `PERMISSIONS` constant array there.

### Per-User Permission Overrides

**Backend endpoints**
- `GET /api/user-permissions/user/{userId}` — list overrides
- `POST /api/user-permissions/grant` — body `{ userId, permissionCode, reason }`
- `POST /api/user-permissions/revoke` — body `{ userId, permissionCode, reason }`
- `DELETE /api/user-permissions/user/{userId}/permission/{permissionCode}` — remove override

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/roles/userPermissionsSlice.js` | New slice |
| `src/features/employees/profile-tabs/PermissionsTab.jsx` | New tab in employee detail — shows overrides table + grant/revoke form |
| `src/features/employees/EmployeeDetailPage.jsx` | Add "Permissions" tab (visible to PLATFORM_SUPER_ADMIN, ENTERPRISE_ADMIN) |

**UI**: Table with columns: Permission Code | Type (Granted/Revoked) | Reason | Actions (Remove). Above the table: a form with permission code dropdown + reason input + Grant/Revoke toggle.

---

## 4. General Settings

### 4a. Company Date/Time Format

**Backend endpoints**
- `GET /api/settings/date-time-format?companyId=`
- `POST /api/settings/date-time-format?companyId=` — body `{ dateFormat, timeFormat }`

### 4b. Dashboard Component Visibility

**Backend endpoints**
- `GET /api/settings/dashboard-components?companyId=`
- `POST /api/settings/dashboard-components/toggle` — body `{ companyId, componentKey }`
- `POST /api/settings/dashboard-components/bulk-update` — body `{ companyId, components: [{componentKey, isEnabled}] }`

### 4c. White Label / Branding

**Backend endpoints**
- `GET /api/settings/white-label?companyId=`
- `POST /api/settings/white-label?companyId=` — body `{ brandName, logoUrl, faviconUrl, primaryColor, isEnabled }`
- `POST /api/settings/white-label/toggle?companyId=`

### 4d. Email Config Test & Set-Primary

**Backend endpoints**
- `POST /api/settings/email/test?companyId=&testEmailTo=`
- `POST /api/settings/email/set-primary?companyId=&configId=`

### 4e. History Tracking Toggle

**Backend endpoints**
- `GET /api/settings/history-tracking?companyId=`
- `POST /api/settings/history-tracking?companyId=` — body `{ isEnabled }`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/settings/generalSettingsSlice.js` | New slice covering all 5 sub-features |
| `src/features/settings/GeneralSettingsPage.jsx` | New page with tabs or sections: Date/Time | White Label | Dashboard | Email | History |
| `src/app/store.js` | Register `generalSettingsReducer` |
| `src/App.jsx` | Add route `/settings/general` |
| `src/components/layout/Sidebar.jsx` | Add "General Settings" under Settings section (ENTERPRISE_ADMIN+ only) |

**UI breakdown per section**

- **Date/Time Format**: Two dropdowns (date format, time format) with a live preview (e.g., "Preview: 07 Apr 2026 | 14:30")
- **White Label**: Form with Brand Name, Logo URL, Favicon URL, Primary Color (color picker input), Is Enabled toggle. Show logo preview if URL is valid.
- **Dashboard Components**: List of component keys as toggle switches (gender_chart, department_chart, headcount_widget, etc.). "Save All" button uses bulk-update.
- **Email Config**: Table of existing configs from `BaseExtrasController`. Each row has a "Set as Primary" button. A "Send Test Email" form with email input below.
- **History Tracking**: Single toggle switch card.

---

## 5. Shift Allocations

**Backend endpoints**
- `GET /api/shift-allocations?companyId=&status=`
- `GET /api/shift-allocations/{id}`
- `GET /api/shift-allocations/employee/{employeeId}`
- `POST /api/shift-allocations` — body: full `ShiftAllocationRequest` object with nested ids
- `PUT /api/shift-allocations/{id}`
- `DELETE /api/shift-allocations/{id}`
- `POST /api/shift-allocations/bulk-allocate` — body `{ employeeIds, shiftId, companyId, effectiveDate }`
- `POST /api/shift-allocations/{id}/approve`
- `POST /api/shift-allocations/{id}/cancel`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/attendance/shiftAllocationsSlice.js` | New slice |
| `src/features/attendance/ShiftAllocationsPage.jsx` | New page — table with status filter + bulk allocate button |
| `src/features/attendance/ShiftAllocationFormModal.jsx` | Create modal — Employee select, Allocated Shift select, Previous Shift (optional), Effective Date, Description |
| `src/features/attendance/BulkAllocateModal.jsx` | Bulk modal — multi-select employees, shift select, effective date |
| `src/app/store.js` | Register `shiftAllocationsReducer` |
| `src/App.jsx` | Add route `/attendance/shift-allocations` |
| `src/components/layout/Sidebar.jsx` | Add link under Attendance section |

**Table columns**: Employee | Allocated Shift | Previous Shift | Effective Date | Status (badge) | Allocated By | Actions (Approve / Cancel / Delete)

**Status filter**: Dropdown — All / PENDING / APPROVED / CANCELLED / REJECTED

**Roles**: Read requires `attendance:view`. Write requires `HR_MANAGER` or above.

---

## 6. Rotating Shift & Work Type Assigns

**Backend endpoints — Rotating Shift Assigns**
- `GET /api/attendance/rotating-shift-assigns?companyId=`
- `GET /api/attendance/rotating-shift-assigns/employee/{empId}`
- `POST /api/attendance/rotating-shift-assigns`
- `PUT /api/attendance/rotating-shift-assigns/{id}`
- `DELETE /api/attendance/rotating-shift-assigns/{id}`
- `POST /api/attendance/rotating-shift-assigns/bulk-assign` — body `{ employeeIds, rotatingShiftId, startDate, shiftId }`

**Backend endpoints — Rotating Work Type Assigns**
- Same pattern under `/api/attendance/rotating-work-type-assigns`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/attendance/rotatingAssignsSlice.js` | New slice covering both shift and work-type assigns |
| `src/features/attendance/RotatingShiftAssignsPage.jsx` | New page — tabbed or separate sections for Shift Assigns vs Work Type Assigns |
| `src/features/attendance/RotatingAssignFormModal.jsx` | Shared modal — Employee, Rotating Template, Start Date, optional direct Shift/WorkType |
| `src/features/attendance/BulkRotatingAssignModal.jsx` | Bulk assign modal |
| `src/app/store.js` | Register `rotatingAssignsReducer` |
| `src/App.jsx` | Add routes `/attendance/rotating-shifts` and `/attendance/rotating-work-types` |
| `src/components/layout/Sidebar.jsx` | Add links under Attendance section |

---

## 7. Shift & Work Type Request Bulk Ops + Export

These are additions to existing pages.

**Backend endpoints — ShiftRequest**
- `POST /api/shift-requests/{id}/cancel`
- `POST /api/shift-requests/bulk-approve` — body `{ ids: [] }`
- `POST /api/shift-requests/bulk-cancel` — body `{ ids: [] }`
- `GET /api/shift-requests/export?companyId=` — returns `.xlsx`

**Backend endpoints — WorkTypeRequest**
- Same pattern under `/api/work-type-requests`

**Files to edit**

| File | Action |
|------|--------|
| `src/features/attendance/shiftRequestsSlice.js` | Add `bulkApprove`, `bulkCancel`, `cancelOne`, `exportRequests` thunks |
| `src/features/attendance/ShiftRequestsPage.jsx` | Add row checkboxes + bulk action toolbar (Approve Selected / Cancel Selected) + Export button |
| `src/features/attendance/workTypeRequestsSlice.js` | Same thunks |
| `src/features/attendance/WorkTypeRequestsPage.jsx` | Same UI additions |

**Export button implementation**
```javascript
// In the thunk:
const res = await api.get('/shift-requests/export', { params: { companyId }, responseType: 'blob' })
const url = URL.createObjectURL(res.data)
const a = document.createElement('a'); a.href = url; a.download = 'shift-requests.xlsx'; a.click()
URL.revokeObjectURL(url)
```

**Bulk action toolbar**: appears above the table when at least 1 row is checked. Dismiss clears selection.

---

## 8. Holiday Import / Export

These are additions to the existing Leave/Holiday management UI.

**Backend endpoints**
- `GET /api/leave/holidays/export?companyId=` — returns `.xlsx`
- `POST /api/leave/holidays/import?companyId=` — multipart `file`, returns `{ imported, errors }`

**Files to edit**

| File | Action |
|------|--------|
| `src/features/leave/leaveSlice.js` | Add `exportHolidays` and `importHolidays` thunks |
| `src/features/leave/HolidaysPage.jsx` (or wherever holidays are listed) | Add Export button + Import button (file input hidden, triggered by button) |

**Import UI**
- "Import" button triggers `<input type="file" accept=".xlsx">` click
- On file select → dispatch `importHolidays({ companyId, file })`
- Show result toast: `"Imported 12 holidays"` or if errors: `"8 imported, 2 errors"` with an expandable error list modal

**Excel column order** (for user reference in a tooltip or download template): Name | Start Date (yyyy-MM-dd) | End Date (yyyy-MM-dd) | Recurring (Yes/No)

**Download template button**: Generates a blank xlsx client-side using a simple array-to-xlsx approach, or just document the format in a tooltip.

---

## 9. Employee Work-Info Import / Export + Bulk Update

### Work-Info Import / Export

**Backend endpoints**
- `GET /api/employees/work-info/export?companyId=` — returns `.xlsx`
- `POST /api/employees/work-info/import?companyId=` — multipart `file`

**Files to edit**

| File | Action |
|------|--------|
| `src/features/employees/employeesSlice.js` | Add `exportWorkInfo` and `importWorkInfo` thunks |
| `src/features/employees/EmployeesPage.jsx` | Add Export Work Info + Import Work Info buttons in the action bar (HR_MANAGER+ only) |

**Excel columns**: Employee ID | Department | Job Position | Shift | Work Type | Reporting Manager ID

### Bulk Field Update

**Backend endpoint**
- `POST /api/employees/bulk-update` — body `{ employeeIds, department, shift, workType, jobPosition }` (all optional except ids)

**Files to edit**

| File | Action |
|------|--------|
| `src/features/employees/employeesSlice.js` | Add `bulkUpdateEmployees` thunk |
| `src/features/employees/EmployeesPage.jsx` | When rows are checked → show bulk action toolbar with "Update Fields" option |
| `src/features/employees/BulkUpdateModal.jsx` | New modal — 4 optional dropdowns (Department, Shift, Work Type, Job Position). Only filled fields are sent. |

---

## 10. Encashment Conditions

**Backend endpoints**
- `GET /api/employees/{id}/encashment-condition`
- `POST /api/employees/{id}/encashment-condition` — body `{ maxEncashableDays, eligibleLeaveTypes, isEligible, notes }`
- `DELETE /api/employees/{id}/encashment-condition`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/employees/employeesSlice.js` | Add `fetchEncashmentCondition`, `upsertEncashmentCondition`, `deleteEncashmentCondition` thunks |
| `src/features/employees/profile-tabs/EncashmentConditionTab.jsx` | New tab — form with Max Encashable Days, Eligible Leave Types (multi-select), Is Eligible toggle, Notes. Save/Delete buttons. |
| `src/features/employees/EmployeeDetailPage.jsx` | Add "Encashment" tab (visible to HR_MANAGER, ACCOUNTANT and above) |

---

## 11. Notification Delete

**Backend endpoints**
- `DELETE /api/notifications/{id}`
- `DELETE /api/notifications`

**Files to edit**

| File | Action |
|------|--------|
| `src/features/notifications/notificationsSlice.js` | Add `deleteNotification(id)` and `deleteAllNotifications()` thunks |
| `src/components/layout/Topbar.jsx` (or notification dropdown) | Add delete (×) icon per notification item + "Clear All" button at top of dropdown |

**UX**: Clicking × on a notification optimistically removes it from local state before the API call resolves. "Clear All" shows a confirm toast with undo option (or a simple confirm dialog).

---

## 12. Audit Tags & Helpdesk Tags

**Backend endpoints — Audit Tags**
- `GET /api/settings/audit-tags?companyId=`
- `POST /api/settings/audit-tags` — body `{ name, color, company: { id } }`
- `PUT /api/settings/audit-tags/{id}`
- `DELETE /api/settings/audit-tags/{id}`

**Backend endpoints — Helpdesk Tags**
- `GET /api/settings/helpdesk-tags?companyId=`
- `POST /api/settings/helpdesk-tags`
- `PUT /api/settings/helpdesk-tags/{id}`
- `DELETE /api/settings/helpdesk-tags/{id}`

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/settings/generalSettingsSlice.js` | Add tag CRUD thunks for both tag types |
| `src/features/settings/TagsSettingsSection.jsx` | Reusable component — renders a tag list with colored badges, inline add/edit form, delete button |
| `src/features/settings/GeneralSettingsPage.jsx` | Add "Tags" tab/section — two subsections: Audit Tags, Helpdesk Tags |

**Tag UI**: Each tag shows as a colored pill badge. Clicking the edit icon opens an inline form. Color input uses `<input type="color">`.

---

## 13. Account Block/Unblock Feature Toggle

**Backend endpoints**
- `GET /api/audit/account-block-feature`
- `POST /api/audit/account-block-feature/toggle`

**Files to edit**

| File | Action |
|------|--------|
| `src/features/settings/generalSettingsSlice.js` | Add `fetchAccountBlockFeature` and `toggleAccountBlockFeature` thunks |
| `src/features/settings/GeneralSettingsPage.jsx` | Add a "Security" section with a toggle switch card: "Account Block/Unblock Feature — Enable automatic account locking" |

**Visibility**: ENTERPRISE_ADMIN and above only.

---

## 14. Platform Company Scope Selector

**Backend endpoints**
- `GET /api/platform/scope/companies` — all companies flat list
- `GET /api/platform/scope/validate/{companyId}`

**Context**: PLATFORM_SUPER_ADMIN needs to switch which company they're viewing. The `X-Company-Id` header is sent on every API request. This is a global switcher in the Topbar.

**Files to create/edit**

| File | Action |
|------|--------|
| `src/features/auth/authSlice.js` | Add `selectedCompanyId` to state, add `setSelectedCompany(id)` action, update localStorage on change |
| `src/services/api.js` | Update request interceptor: read `selectedCompanyId` from store/localStorage (overrides user's own companyId when set) |
| `src/features/platform/platformSlice.js` | New slice — `fetchAllCompaniesForScope` thunk |
| `src/components/layout/Topbar.jsx` | Add company switcher dropdown (visible only to PLATFORM_SUPER_ADMIN) — shows "All Companies" or selected company name |
| `src/components/layout/CompanySwitcher.jsx` | New component — searchable dropdown list of all companies from `/api/platform/scope/companies` |

**UX flow**
```
PLATFORM_SUPER_ADMIN sees in Topbar: [🏢 Acme Corp ▼]
Click → dropdown with search input
Select a company → dispatches setSelectedCompany(id)
→ X-Company-Id header updates for all future requests
→ Page data refreshes (dispatch fetchAll for current page)
```

**"View All"** option sets `selectedCompanyId` to `null` — backend uses admin's implicit access to all companies.

---

## Implementation Order (Recommended)

Work top-to-bottom within each day. Each item is roughly a half-day of work.

| Day | Features |
|-----|----------|
| **Day 1** | Platform Company Scope Selector (#14) — critical for testing all other admin features |
| **Day 1** | Auth Account Settings — Change Username + Change Password (#1) |
| **Day 2** | Two-Factor Authentication (#2) |
| **Day 2** | Notification Delete (#11) |
| **Day 3** | General Settings page scaffold + Date/Time + White Label + History Tracking (#4a, 4c, 4e) |
| **Day 3** | Dashboard Components + Email Set-Primary/Test + Account Block Toggle (#4b, 4d, #13) |
| **Day 4** | User Groups (#3 — Groups part) |
| **Day 4** | Per-User Permission Overrides (#3 — Overrides part) |
| **Day 5** | Shift Allocations — CRUD + Bulk Allocate (#5) |
| **Day 5** | Audit Tags + Helpdesk Tags (#12) |
| **Day 6** | Shift & Work Type Request Bulk Ops + Export (#7) |
| **Day 6** | Holiday Import / Export (#8) |
| **Day 7** | Employee Work-Info Import/Export + Bulk Update (#9) |
| **Day 7** | Encashment Conditions (#10) |
| **Day 8** | Rotating Shift & Work Type Assigns (#6) |
| **Day 8** | 2FA Admin panel + QA pass on all features |

---

## New Routes to Add in `App.jsx`

```jsx
// Settings
<Route path="settings/account" element={<ProtectedRoute element={<AccountSettingsPage />} />} />
<Route path="settings/general" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN']} element={<GeneralSettingsPage />} />} />

// Roles
<Route path="roles/user-groups" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN']} element={<UserGroupsPage />} />} />

// Attendance
<Route path="attendance/shift-allocations" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER']} element={<ShiftAllocationsPage />} />} />
<Route path="attendance/rotating-shifts" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER']} element={<RotatingShiftAssignsPage />} />} />
<Route path="attendance/rotating-work-types" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER']} element={<RotatingWorkTypeAssignsPage />} />} />
```

---

## New Redux Slices to Register in `store.js`

```javascript
import twoFactorReducer from '../features/auth/twoFactorSlice'
import userGroupsReducer from '../features/roles/userGroupsSlice'
import userPermissionsReducer from '../features/roles/userPermissionsSlice'
import generalSettingsReducer from '../features/settings/generalSettingsSlice'
import shiftAllocationsReducer from '../features/attendance/shiftAllocationsSlice'
import rotatingAssignsReducer from '../features/attendance/rotatingAssignsSlice'
import platformReducer from '../features/platform/platformSlice'
```

---

## Permissions Reference (add to `src/config/constants.js`)

```javascript
export const PERMISSIONS = [
  'attendance:view', 'attendance:manage',
  'leave:view', 'leave:approve',
  'payroll:view', 'payroll:manage',
  'recruitment:view', 'recruitment:manage',
  'employee:view', 'employee:manage',
  'helpdesk:view', 'helpdesk:manage',
  'report:view',
  'asset:view', 'asset:manage',
  'project:view', 'project:manage',
  'pms:view', 'pms:manage',
]
```

---

## Shared Patterns to Follow

### File upload (import)
```jsx
const fileInputRef = useRef()

<Button onClick={() => fileInputRef.current.click()}>Import</Button>
<input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
  onChange={e => {
    const file = e.target.files[0]
    if (file) dispatch(importXxx({ companyId, file }))
    e.target.value = ''  // reset so same file can be re-selected
  }}
/>
```

### File download (export)
```javascript
export const exportXxx = createAsyncThunk('xxx/export', async (params) => {
  const res = await api.get('/xxx/export', { params, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'export.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
})
```

### Bulk selection in DataTable
```jsx
// Add a checkbox column as the first column in column def
{
  id: 'select',
  header: ({ table }) => <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />,
  cell: ({ row }) => <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
}

// Bulk toolbar (show when selection > 0)
{selectedRows.length > 0 && (
  <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
    <span className="text-sm text-indigo-700">{selectedRows.length} selected</span>
    <Button size="sm" onClick={handleBulkApprove}>Approve</Button>
    <Button size="sm" variant="danger" onClick={handleBulkCancel}>Cancel</Button>
  </div>
)}
```
