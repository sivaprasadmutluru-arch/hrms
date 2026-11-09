/**
 * AccrueHRMS Assistant Knowledge Base
 * Production-ready documentation & feature guide inspired by Stripe Docs/Dashboard Assistant.
 * Answers any question about using the application, step-by-step feature workflows,
 * statutory rules, and self-service records.
 */

export const FEATURE_TOPICS = [
  // --- GETTING STARTED & SETUP ---
  {
    id: 'getting-started',
    title: 'Getting Started with AccrueHRMS',
    category: 'Quick Start',
    keywords: ['getting started', 'quick start', 'setup guide', 'how to start', 'onboard company', 'setup organization', 'first steps', 'guide'],
    summary: 'Follow the 4-step setup checklist to configure and launch your organization workspace.',
    steps: [
      '**Step 1: Company Profile & Workweek** — Upload your logo, office hours, weekend rules, and legal address in Company Settings.',
      '**Step 2: Add or Import Employees** — Add your team members individually or in bulk using Excel/CSV templates in Employee Directory.',
      '**Step 3: Configure Leave & Attendance** — Define leave quotas (Sick, Casual, Annual), set shift schedules, and check-in grace thresholds.',
      '**Step 4: Payroll & Compliance** — Setup salary components, compute statutory deductions (PF, ESI, TDS, PT), and issue monthly payslips.'
    ],
    action: { label: 'Open Dashboard & Checklist', path: '/dashboard' },
    related: ['company-settings', 'employees-add', 'attendance-schedules', 'payroll-run']
  },
  {
    id: 'company-settings',
    title: 'Company Profile, Branches & Workweek',
    category: 'Organization',
    keywords: ['company settings', 'branches', 'workweek', 'office hours', 'weekend rules', 'timezone', 'logo', 'currency', 'head office'],
    summary: 'Configure company information, add regional branches, set weekly working days, and upload organization branding.',
    steps: [
      'Navigate to **Company** > **Companies** or **Company Settings** from the sidebar.',
      'Upload your company logo (PNG, JPG, or SVG) and enter official registration details (GSTIN, PAN, address).',
      'Under **Workweek**, toggle working days (e.g., Monday through Friday) and set weekend policy.',
      'To manage multi-branch operations, click **Add Branch** to configure separate sub-entities with their own location parameters.'
    ],
    action: { label: 'Manage Companies & Branches', path: '/companies' },
    related: ['getting-started', 'roles-permissions', 'subscription-billing']
  },
  {
    id: 'roles-permissions',
    title: 'Roles & Access Permissions (RBAC)',
    category: 'Security',
    keywords: ['roles', 'permissions', 'access control', 'rbac', 'super admin', 'enterprise admin', 'branch admin', 'hr manager', 'accountant', 'user groups'],
    summary: 'Manage user access levels across predefined administrative roles and custom user groups.',
    steps: [
      'Open **Roles & Access** from the navigation sidebar.',
      'Predefined roles include **Platform Super Admin**, **Enterprise Admin**, **Branch Admin**, **HR Manager**, **Accountant**, and **Employee**.',
      'To search available role assignments dynamically, use the real-time Roles search bar.',
      'To create custom permission bundles, navigate to **User Groups** (/roles/user-groups) and select granular module permissions.'
    ],
    action: { label: 'Configure Roles & Access', path: '/roles' },
    related: ['company-settings', 'approval-workflows', 'audit-logs']
  },
  {
    id: 'approval-workflows',
    title: 'Multi-Level Approval Conditions',
    category: 'Organization',
    keywords: ['approval', 'approval conditions', 'workflow', 'multi-level', 'leave approval', 'loan approval', 'expense approval'],
    summary: 'Configure automated approval hierarchies and conditions for leaves, loans, and reimbursements.',
    steps: [
      'Go to **Settings** > **Approval Conditions** from the navigation menu.',
      'Select the target module (Leave Request, Loan Request, or Reimbursement).',
      'Define condition criteria (e.g. leave duration > 3 days, or loan amount > ₹50,000) and specify approval chain (Reporting Manager -> Department Head -> HR Manager).',
      'Save the rule; requests matching the criteria will automatically route through the configured approvers.'
    ],
    action: { label: 'View Approval Conditions', path: '/settings/approval-conditions' },
    related: ['leaves-approval', 'payroll-loans', 'payroll-reimbursements']
  },

  // --- EMPLOYEE MANAGEMENT ---
  {
    id: 'employees-add',
    title: 'How to Add a New Employee',
    category: 'Employees',
    keywords: ['add employee', 'create employee', 'new hire', 'employee directory', 'staff registration', 'onboard employee'],
    summary: 'Create individual employee profiles with personal details, job position, salary structure, and login credentials.',
    steps: [
      'Go to **Employees** from the sidebar and click the **+ Add Employee** button.',
      '**Basic Info:** Enter employee ID, first & last name, official work email, mobile number, and joining date.',
      '**Work & Position:** Assign Company Branch, Department, Job Position, Work Type (On-site/Remote), and Reporting Manager.',
      '**Bank & Statutory:** Enter bank account number, IFSC code, PAN, and UAN (Provident Fund).',
      'Click **Save Employee**. The employee automatically receives onboarding welcome credentials via email.'
    ],
    action: { label: 'Go to Employee Directory', path: '/employees' },
    related: ['employees-import', 'employees-org-chart', 'onboarding']
  },
  {
    id: 'employees-import',
    title: 'Bulk Import Employees via Excel / CSV',
    category: 'Employees',
    keywords: ['import employees', 'bulk upload', 'excel import', 'csv upload', 'mass employee import', 'upload staff'],
    summary: 'Upload dozens or hundreds of employee records in a single batch using standard spreadsheet templates.',
    steps: [
      'Navigate to **Employees** and click the **Import** button in the header toolbar.',
      'Click **Download Template** to get the pre-formatted Excel/CSV template with all required columns.',
      'Fill in employee details in the downloaded template without altering column headers.',
      'Drag and drop the completed file into the upload zone and click **Validate & Import**.',
      'Review any validation highlights. Successfully imported employees will immediately appear in the directory.'
    ],
    action: { label: 'Open Employee Directory', path: '/employees' },
    related: ['employees-add', 'employees-departments', 'employees-job-positions']
  },
  {
    id: 'employees-org-chart',
    title: 'Visual Organization Chart',
    category: 'Employees',
    keywords: ['org chart', 'organization chart', 'hierarchy', 'reporting structure', 'tree view', 'manager hierarchy'],
    summary: 'Explore interactive visual hierarchy of your company, showing reporting managers and departmental structures.',
    steps: [
      'Click **Org Chart** under the Employees navigation section.',
      'The chart displays an interactive tree rooted at executive leadership down through branch and department heads.',
      'Zoom, pan, or search for any team member to see their direct reports and management line.'
    ],
    action: { label: 'View Organization Chart', path: '/employees/org-chart' },
    related: ['employees-add', 'employees-departments', 'employees-job-positions']
  },
  {
    id: 'employees-departments',
    title: 'Departments & Job Positions',
    category: 'Employees',
    keywords: ['departments', 'job positions', 'designations', 'salary bands', 'job roles', 'add department'],
    summary: 'Organize your workforce into functional departments and define standardized job titles with pay grades.',
    steps: [
      '**Departments:** Go to **Employees** > **Departments** to add departments (e.g. Engineering, Sales, HR) and assign department heads.',
      '**Job Positions:** Go to **Employees** > **Job Positions** to create specific designations (e.g. Senior Software Engineer) with salary bands.',
      'Assigning employees to standardized positions ensures accurate role-based permissions and compensation structures.'
    ],
    action: { label: 'Manage Departments', path: '/employees/departments' },
    related: ['employees-org-chart', 'roles-permissions', 'payroll-run']
  },
  {
    id: 'employees-work-types',
    title: 'Work Types (Remote, Hybrid, On-site)',
    category: 'Employees',
    keywords: ['work types', 'remote work', 'hybrid work', 'work from home', 'wfh', 'on-site', 'wfh request'],
    summary: 'Define flexible work modes and allow employees to request Remote or Hybrid working arrangements.',
    steps: [
      'Access **Work Types** under Employees settings.',
      'Create or edit work arrangements: On-site, Hybrid, or Full Remote.',
      'Employees can submit **Work Type Requests** for temporary or permanent remote status from their self-service portal.'
    ],
    action: { label: 'View Work Types', path: '/employees/work-types' },
    related: ['attendance-checkin', 'geofencing', 'attendance-regularisation']
  },
  {
    id: 'onboarding',
    title: 'Employee Onboarding Workflows',
    category: 'Employees',
    keywords: ['onboarding', 'new joiner', 'joiner tasks', 'induction', 'welcome kit', 'onboarding checklist'],
    summary: 'Track new hire onboarding tasks, document verification, asset provisioning, and team introductions.',
    steps: [
      'Navigate to **Onboarding** from the main navigation menu.',
      'Create onboarding task lists (e.g., IT hardware setup, bank detail verification, signing NDA).',
      'Assign tasks to HR, IT, and the new employee with due dates and track completion status in real-time.'
    ],
    action: { label: 'Go to Onboarding Hub', path: '/onboarding' },
    related: ['employees-add', 'offboarding', 'documents-letters']
  },
  {
    id: 'offboarding',
    title: 'Resignations & Offboarding Workflows',
    category: 'Employees',
    keywords: ['offboarding', 'resignation', 'exit', 'exit interview', 'clearance', 'notice period', 'relieving'],
    summary: 'Manage employee resignations, notice periods, departmental clearance, exit interviews, and asset recovery.',
    steps: [
      'Go to **Offboarding** from the sidebar menu.',
      'Review employee resignation submissions with proposed last working day (LWD) and notice period calculation.',
      'Initiate clearance checklists across IT (assets), Finance (loans/expenses), and HR.',
      'Upon completion, issue the Relieving Letter and Experience Certificate directly from Letters Hub.'
    ],
    action: { label: 'Go to Offboarding Hub', path: '/offboarding' },
    related: ['onboarding', 'documents-letters', 'assets-management']
  },

  // --- ATTENDANCE & BIOMETRIC TRACKING ---
  {
    id: 'attendance-checkin',
    title: 'How Employee Check-in & Check-out Works',
    category: 'Attendance',
    keywords: ['check in', 'check out', 'attendance', 'clock in', 'clock out', 'web punch', 'self punch', 'mark attendance'],
    summary: 'Employees can check in and out through the dashboard widget with optional photo, geo-location, or biometric sync.',
    steps: [
      '**Web Check-in:** On the main Dashboard, click the **Check In** button. If enabled, allow camera or location access.',
      '**Biometric Sync:** If your office uses physical biometric machines, punches synchronize automatically without web check-in.',
      'At the end of the shift, click **Check Out** on the dashboard to calculate total hours worked.',
      'Attendance logs update in real-time in the Attendance Register.'
    ],
    action: { label: 'Open Attendance Hub', path: '/attendance' },
    related: ['attendance-grace', 'attendance-regularisation', 'biometric-devices']
  },
  {
    id: 'attendance-grace',
    title: '1-Hour Check-in Grace Period & Late Rules',
    category: 'Attendance',
    keywords: ['grace period', 'grace time', 'late check in', 'late arrival', 'half day', 'shift time', '1 hour grace'],
    summary: 'AccrueHRMS defaults to a 1-hour check-in grace period before an employee is marked as late arrival.',
    steps: [
      'Go to **Attendance** > **Attendance Settings** from the sidebar.',
      'The system provides a **1-Hour Grace Period** default (e.g. 9:00 AM shift allows check-in up to 10:00 AM without late penalty).',
      'You can adjust the grace period minutes, minimum hours for Half-Day (e.g. 4 hours), and Full-Day (e.g. 8 hours).',
      'Late arrivals beyond the grace period are flagged in monthly attendance and payroll deduction summaries.'
    ],
    action: { label: 'Configure Attendance Settings', path: '/attendance/settings' },
    related: ['attendance-checkin', 'attendance-schedules', 'attendance-regularisation']
  },
  {
    id: 'attendance-regularisation',
    title: 'Attendance Regularisation Requests',
    category: 'Attendance',
    keywords: ['regularisation', 'regularization', 'missed punch', 'forgot to check in', 'adjust attendance', 'fix attendance'],
    summary: 'Employees can request corrections for missed punches or off-site meetings, subject to manager approval.',
    steps: [
      '**To Submit:** Employees go to **Attendance** > **Regularisation**, pick the missed date, specify correct Check-in / Check-out time and reason, and click Submit.',
      '**To Approve:** Managers and HR review pending requests in **Attendance** > **Regularisation**, inspect notes, and click **Approve** or **Reject**.',
      'Once approved, the attendance record is updated automatically.'
    ],
    action: { label: 'Attendance Regularisation Hub', path: '/attendance/regularisation' },
    related: ['attendance-checkin', 'attendance-grace', 'approval-workflows']
  },
  {
    id: 'attendance-schedules',
    title: 'Shift Schedules & Core Working Hours',
    category: 'Attendance',
    keywords: ['shift', 'shifts', 'shift schedule', 'work hours', 'morning shift', 'night shift', 'general shift'],
    summary: 'Define recurring shift timings, break durations, and overtime rules for different teams.',
    steps: [
      'Open **Attendance** > **Shift Schedules** from the menu.',
      'Click **+ Add Shift Schedule** and provide a title (e.g. General 9-to-6, UK Shift, Night Shift).',
      'Specify Start Time, End Time, Break Duration, and early exit tolerance.',
      'Assign the schedule to employees via **Shift Allocations**.'
    ],
    action: { label: 'Manage Shift Schedules', path: '/attendance/schedules' },
    related: ['attendance-rotating', 'attendance-grace', 'attendance-checkin']
  },
  {
    id: 'attendance-rotating',
    title: 'Rotating Shifts & Shift Allocations',
    category: 'Attendance',
    keywords: ['rotating shift', 'shift rotation', 'shift assignment', 'roster', 'weekly rotation', 'shift allocation'],
    summary: 'Schedule employees into automatic weekly or monthly shift rotations.',
    steps: [
      'Go to **Attendance** > **Shift Allocations** to assign fixed shifts to employees.',
      'To enable dynamic shift rotations, go to **Rotating Shifts** (/attendance/rotating-shifts).',
      'Set rotation frequency (e.g. Every 7 days switch from Morning to Afternoon Shift) and effective date range.'
    ],
    action: { label: 'View Shift Allocations', path: '/attendance/shift-allocations' },
    related: ['attendance-schedules', 'attendance-checkin', 'attendance-grace']
  },
  {
    id: 'biometric-devices',
    title: 'Biometric Device Connection (ZKTeco, Essl, etc.)',
    category: 'Attendance',
    keywords: ['biometric', 'biometric device', 'zkteco', 'essl', 'fingerprint machine', 'punch machine', 'face machine', 'device ip'],
    summary: 'Connect physical biometric fingerprint and facial attendance machines to AccrueHRMS via LAN/WAN.',
    steps: [
      'Navigate to **Biometric** > **Devices** from the navigation sidebar.',
      'Click **+ Register Device** and enter Device Name, IP Address, Port (default 4370), Protocol, and Branch Location.',
      'Test connection to verify communication between AccrueHRMS and the physical terminal.',
      'Punches recorded on the machine will stream into AccrueHRMS in real time.'
    ],
    action: { label: 'Manage Biometric Devices', path: '/biometric/devices' },
    related: ['biometric-employees', 'attendance-checkin', 'geofencing']
  },
  {
    id: 'biometric-employees',
    title: 'Mapping Biometric Device IDs to Employees',
    category: 'Attendance',
    keywords: ['biometric employee', 'device user id', 'fingerprint mapping', 'enroll biometric', 'device id'],
    summary: 'Map the numeric user ID registered on your biometric machine to the employee profile in AccrueHRMS.',
    steps: [
      'Open **Biometric** > **Employees** from the sidebar.',
      'Find the employee and enter their corresponding **Biometric Device User ID** (e.g. 101, 102).',
      'Save the mapping. Whenever the employee punches on the machine, AccrueHRMS attributes the punch to their profile.'
    ],
    action: { label: 'Biometric Employee Mapping', path: '/biometric/employees' },
    related: ['biometric-devices', 'attendance-checkin', 'employees-add']
  },
  {
    id: 'geofencing',
    title: 'Geofencing Punch Restrictions',
    category: 'Attendance',
    keywords: ['geofencing', 'location punch', 'gps', 'geo fence', 'radius', 'office coordinates'],
    summary: 'Restrict web and mobile check-ins so employees can only punch when physically inside office GPS boundaries.',
    steps: [
      'Go to **Attendance** > **GeoFencing** from the sidebar.',
      'Set office latitude and longitude coordinates and set the acceptable radius in meters (e.g. 150m).',
      'Enable geofence enforcement. Employees punching outside the perimeter will be blocked or flagged.'
    ],
    action: { label: 'Configure GeoFencing', path: '/geofencing' },
    related: ['attendance-checkin', 'biometric-devices', 'company-settings']
  },

  // --- LEAVE & HOLIDAYS ---
  {
    id: 'leaves-request',
    title: 'How to Apply for Leave',
    category: 'Leaves',
    keywords: ['apply leave', 'request leave', 'take leave', 'leave application', 'vacation request', 'sick leave apply', 'pto'],
    summary: 'Employees can submit leave requests with date ranges, leave types, and optional documentation attachments.',
    steps: [
      'Open **Leaves** from the sidebar and click **Request Leave**.',
      'Select the **Leave Type** (Casual, Sick, Paid, Maternity, etc.).',
      'Choose the **Start Date** and **End Date** (supports half-day options).',
      'Enter the reason for leave and attach supporting documents (e.g. medical certificate for sick leave) if required.',
      'Click **Submit Request**. Your reporting manager is notified immediately for review.'
    ],
    action: { label: 'Open Leave Hub', path: '/leaves' },
    related: ['leaves-approval', 'leaves-types', 'leaves-holidays']
  },
  {
    id: 'leaves-approval',
    title: 'How Managers Review & Approve Leave Requests',
    category: 'Leaves',
    keywords: ['approve leave', 'reject leave', 'leave approval', 'manager approval', 'pending leave'],
    summary: 'Managers and HR personnel can review, approve, or reject employee leave requests with custom comments.',
    steps: [
      'Navigate to **Leaves** and click the **Approvals** or **Pending Requests** tab.',
      'Inspect the employee’s leave balance, dates, days count, and reason.',
      'Click **Approve** to grant the leave, or click **Reject** and provide mandatory feedback.',
      'The employee receives an instant notification with the decision, and their leave balance updates automatically.'
    ],
    action: { label: 'View Leave Approvals', path: '/leaves' },
    related: ['leaves-request', 'approval-workflows', 'leaves-types']
  },
  {
    id: 'leaves-types',
    title: 'Configuring Leave Types & Annual Quotas',
    category: 'Leaves',
    keywords: ['leave types', 'leave policy', 'leave balance', 'leave quota', 'annual leave', 'casual leave', 'sick leave', 'maternity leave'],
    summary: 'Define leave categories, carry-forward policies, paid vs unpaid rules, and annual day allocations.',
    steps: [
      '**Leave Types:** Go to **Leaves** > **Leave Types** (/leaves/types) to configure types like Casual Leave (CL), Sick Leave (SL), and Earned Leave (EL).',
      'Specify whether each type is Paid or Unpaid, and if unused balance can carry forward into the next year.',
      '**Allocations:** Go to **Leave Allocations** to grant annual quotas (e.g. 12 days CL, 12 days SL) to employees individually or in bulk.'
    ],
    action: { label: 'Manage Leave Types', path: '/leaves/types' },
    related: ['leaves-request', 'leaves-restrictions', 'leaves-holidays']
  },
  {
    id: 'leaves-holidays',
    title: 'Public & Company Holiday Calendar',
    category: 'Leaves',
    keywords: ['holidays', 'holiday calendar', 'public holiday', 'diwali', 'new year', 'company holidays', 'national holidays'],
    summary: 'Maintain company holiday schedules by branch and view upcoming paid public holidays.',
    steps: [
      'Go to **Leaves** > **Holidays** from the navigation menu.',
      'Click **+ Add Holiday**, specify Holiday Name, Date, and whether it applies to all branches or a specific location.',
      'Holidays are automatically highlighted on the employee Attendance Calendar and excluded from leave balance deductions.'
    ],
    action: { label: 'View Holiday Calendar', path: '/leaves/holidays' },
    related: ['leaves-request', 'attendance-checkin', 'company-settings']
  },

  // --- PAYROLL & STATUTORY COMPLIANCE ---
  {
    id: 'payroll-run',
    title: 'How to Run Automated Payroll',
    category: 'Payroll',
    keywords: ['run payroll', 'calculate salary', 'process payroll', 'monthly payroll', 'automated payroll', 'generate payslips', 'pay run'],
    summary: 'Compute monthly salaries with automated statutory deductions, attendance reconciliation, and batch payslip generation.',
    steps: [
      'Navigate to **Payroll** > **Automated Payroll** from the main sidebar.',
      'Select the target **Year and Month**, then pick your company branch or batch group.',
      'Click **Calculate Payroll** — the system aggregates attendance hours, unpaid leaves, basic salary, allowances, and statutory taxes (PF, ESI, PT, TDS).',
      'Review computed gross and net pay summary. Apply manual adjustments if necessary.',
      'Click **Finalize & Issue Payslips**. Payslips are immediately published to employee self-service.'
    ],
    action: { label: 'Open Automated Payroll', path: '/payroll/automated' },
    related: ['payroll-payslips', 'payroll-statutory', 'payroll-allowances', 'payroll-loans']
  },
  {
    id: 'payroll-payslips',
    title: 'Viewing & Downloading Payslips (PDF)',
    category: 'Payroll',
    keywords: ['payslip', 'payslips', 'salary slip', 'download payslip', 'payslip pdf', 'salary statement', 'net pay'],
    summary: 'Employees and HR can inspect salary breakdowns and download clean, professional PDF payslips.',
    steps: [
      'Navigate to **Payroll** > **Payslips** from the sidebar.',
      'Click **View** on any payslip row to open the modal with detailed earnings, statutory deductions, and net pay.',
      'Click the **Download PDF** button to generate an official branded payslip PDF.',
      'Attendance summaries are kept private and excluded from the external payslip PDF for clean compliance.'
    ],
    action: { label: 'View Payslips', path: '/payroll/payslips' },
    related: ['payroll-run', 'payroll-statutory', 'payroll-allowances']
  },
  {
    id: 'payroll-statutory',
    title: 'India Statutory Compliance (EPF, ESI, PT, Gratuity, TDS)',
    category: 'Payroll',
    keywords: ['statutory', 'pf', 'epf', 'esi', 'professional tax', 'pt', 'gratuity', 'tds', 'tax deduction', 'india payroll'],
    summary: 'AccrueHRMS natively supports Indian statutory compliance rules and calculations.',
    steps: [
      'Navigate to **Payroll** > **Deductions** (/payroll/deductions) to review statutory rules:',
      '**EPF (Provident Fund):** 12% employee contribution on Basic + DA (capped at ₹15,000 threshold or full basic).',
      '**ESI (Employee State Insurance):** 0.75% employee contribution & 3.25% employer contribution for gross wages ≤ ₹21,000/mo.',
      '**Professional Tax (PT):** State-specific slab deductions (e.g. Karnataka, Maharashtra, Telangana, Tamil Nadu).',
      '**Gratuity & TDS:** Gratuity provisioning and monthly TDS income tax withholding based on annual tax regimes.'
    ],
    action: { label: 'Manage Deductions', path: '/payroll/deductions' },
    related: ['payroll-run', 'payroll-allowances', 'payroll-payslips']
  },
  {
    id: 'payroll-allowances',
    title: 'Salary Components & Allowances (HRA, DA, Bonus)',
    category: 'Payroll',
    keywords: ['allowances', 'salary structure', 'hra', 'da', 'conveyance', 'special allowance', 'bonus', 'ctc breakdown'],
    summary: 'Define fixed or percentage-based salary components including HRA, DA, medical, and performance bonuses.',
    steps: [
      'Go to **Payroll** > **Allowances** from the sidebar menu.',
      'Click **+ Add Allowance** to create custom earning components (e.g. House Rent Allowance, Dearness Allowance, Internet Allowance).',
      'Set whether the allowance is Fixed Amount or Percentage of Basic Pay, and if it is Taxable or Exempt.',
      'Assigned allowances compute automatically during each monthly payroll run.'
    ],
    action: { label: 'Configure Allowances', path: '/payroll/allowances' },
    related: ['payroll-run', 'payroll-statutory', 'payroll-payslips']
  },
  {
    id: 'payroll-loans',
    title: 'Employee Loans & Salary Advances',
    category: 'Payroll',
    keywords: ['loans', 'loan request', 'salary advance', 'emi', 'installment', 'loan deduction', 'repayment schedule'],
    summary: 'Process employee loan requests, manage EMI schedules, and auto-deduct monthly installments from payroll.',
    steps: [
      '**Employee Request:** Employees go to **Payroll** > **Loans** and click **Request Loan**, specifying amount, reason, and desired installments.',
      '**Approval:** HR and Finance review terms, adjust installment count or interest, and approve the loan.',
      '**Payroll Deduction:** When monthly payroll is calculated, the system automatically deducts the active installment from net pay.'
    ],
    action: { label: 'Manage Loans', path: '/payroll/loans' },
    related: ['payroll-run', 'payroll-reimbursements', 'approval-workflows']
  },
  {
    id: 'payroll-reimbursements',
    title: 'Expense Claims & Reimbursements',
    category: 'Payroll',
    keywords: ['reimbursement', 'expense claim', 'receipt upload', 'travel claim', 'food expense', 'bill reimbursement'],
    summary: 'Employees submit expense claims with receipt receipts; managers approve for payroll disbursement.',
    steps: [
      'Employees open **Payroll** > **Reimbursements** and click **Claim Expense**.',
      'Enter Title, Expense Date, Category (Travel, Meal, Client Entertainment), Amount, and attach bills/receipts.',
      'Managers verify receipts and approve the claim.',
      'Approved reimbursements are automatically disbursed alongside regular monthly payroll.'
    ],
    action: { label: 'Reimbursements Hub', path: '/payroll/reimbursements' },
    related: ['payroll-run', 'payroll-loans', 'approval-workflows']
  },

  // --- RECRUITMENT & CAREERS ---
  {
    id: 'recruitment-posts',
    title: 'Creating & Publishing Job Openings',
    category: 'Recruitment',
    keywords: ['job opening', 'job post', 'hiring', 'recruitment', 'publish job', 'vacancy', 'job description'],
    summary: 'Publish new job openings with responsibilities, qualifications, salary range, and hiring deadlines.',
    steps: [
      'Navigate to **Recruitment** > **Recruitment Posts** from the sidebar.',
      'Click **+ Create Job Opening** and select the Job Position and Department.',
      'Enter vacancy count, required experience, location, remote policy, and full job description.',
      'Click **Publish**. The opening immediately displays on your public Careers Page for candidate applications.'
    ],
    action: { label: 'Manage Job Openings', path: '/recruitment/posts' },
    related: ['recruitment-pipeline', 'recruitment-interviews', 'recruitment-careers']
  },
  {
    id: 'recruitment-pipeline',
    title: 'Candidate Pipeline (Kanban Board)',
    category: 'Recruitment',
    keywords: ['pipeline', 'candidate pipeline', 'kanban', 'recruitment pipeline', 'applicant tracking', 'ats', 'candidate stages'],
    summary: 'Visual Kanban pipeline to track applicants through Screening, Interview, Offered, and Hired stages.',
    steps: [
      'Go to **Recruitment** > **Pipeline**.',
      'Candidates are organized by stages: **Applied**, **Screening**, **Interview**, **Offered**, **Hired**, and **Rejected**.',
      'Drag and drop applicant cards across columns to advance their hiring stage.',
      'Click any candidate card to view resume, contact information, interview ratings, and interviewer notes.'
    ],
    action: { label: 'Open Candidate Pipeline', path: '/recruitment/pipeline' },
    related: ['recruitment-posts', 'recruitment-interviews', 'documents-letters']
  },
  {
    id: 'recruitment-interviews',
    title: 'Scheduling Candidate Interviews',
    category: 'Recruitment',
    keywords: ['interview', 'schedule interview', 'interviewers', 'candidate evaluation', 'interview rating'],
    summary: 'Schedule technical and HR interviews, assign team interviewers, and collect structured feedback.',
    steps: [
      'Open **Recruitment** > **Interviews**.',
      'Click **Schedule Interview**, select Candidate and Job Opening.',
      'Pick date, time, meeting link/room, and assign panel interviewers from your staff.',
      'Interviewers submit ratings (1-5 stars) and qualitative feedback directly into the candidate profile.'
    ],
    action: { label: 'View Interviews Hub', path: '/recruitment/interviews' },
    related: ['recruitment-pipeline', 'recruitment-posts', 'documents-letters']
  },
  {
    id: 'recruitment-careers',
    title: 'Public Career Portal & Careers Widget',
    category: 'Recruitment',
    keywords: ['careers page', 'career portal', 'careers widget', 'embed careers', 'job board', 'public jobs'],
    summary: 'Host a branded public careers page (/careers/:slug) or embed your open jobs on your external website.',
    steps: [
      'Your public careers page is live at `/careers/:your-company-slug`.',
      'Candidates can view active job listings, filter by department, read requirements, and apply with resume upload.',
      'To embed jobs on your company corporate website, use the lightweight careers script widget found under Careers integration.'
    ],
    action: { label: 'Go to Recruitment Hub', path: '/recruitment' },
    related: ['recruitment-posts', 'recruitment-pipeline', 'company-settings']
  },

  // --- DOCUMENTS & LETTERS ---
  {
    id: 'documents-letters',
    title: 'Generating Official Letters (Offer, Appointment, Relieving)',
    category: 'Documents',
    keywords: ['letters', 'offer letter', 'appointment letter', 'promotion letter', 'relieving letter', 'experience certificate', 'generate letter'],
    summary: 'Generate standardized official company letters with dynamic placeholders, PDF preview, and 1-click email dispatch.',
    steps: [
      'Navigate to **Documents** > **Letters** from the sidebar.',
      'Click **+ Create Letter** and select the Letter Type (Offer Letter, Appointment Letter, Promotion, Relieving, or Experience Certificate).',
      'Pick the candidate or employee; dynamic placeholders (name, salary, designation, joining date) auto-populate.',
      'Click **Preview PDF** to inspect layout and signature branding.',
      'Click **Send Email** to dispatch the PDF directly to the recipient with an official email cover.'
    ],
    action: { label: 'Open Letters Hub', path: '/documents/letters' },
    related: ['documents-requests', 'onboarding', 'offboarding']
  },
  {
    id: 'documents-requests',
    title: 'Employee Document Requests',
    category: 'Documents',
    keywords: ['document request', 'bonafide letter', 'salary certificate', 'address proof', 'visa letter', 'request document'],
    summary: 'Employees can submit formal requests for salary certificates, bonafide letters, or embassy visa letters.',
    steps: [
      'Employees navigate to **Documents** > **Document Requests** and click **New Request**.',
      'Select Document Type (Salary Certificate, Bonafide, Visa Support) and state the purpose.',
      'HR approves the request and uploads or generates the signed document for the employee to download.'
    ],
    action: { label: 'View Document Requests', path: '/documents/requests' },
    related: ['documents-letters', 'documents-my']
  },

  // --- PERFORMANCE & OKRs ---
  {
    id: 'performance-objectives',
    title: 'Setting Goals & OKRs (Objectives & Key Results)',
    category: 'Performance',
    keywords: ['okr', 'objectives', 'goals', 'key results', 'kpi', 'performance tracking', 'targets'],
    summary: 'Align organizational priorities with department and individual employee Objectives & Key Results.',
    steps: [
      'Open **Performance** > **Objectives** from the sidebar menu.',
      'Click **+ Create Objective** and set the Title, Timeframe (e.g. Q1, Annual), and Target Metric.',
      'Add measurable Key Results (e.g. Increase product adoption by 25%).',
      'Employees update their progress percentages regularly, giving managers a transparent overview of achievements.'
    ],
    action: { label: 'Open Objectives Hub', path: '/performance/objectives' },
    related: ['performance-cycles', 'performance-surveys']
  },
  {
    id: 'performance-cycles',
    title: 'Performance Appraisal & Review Cycles',
    category: 'Performance',
    keywords: ['performance cycle', 'appraisal', 'annual review', 'quarterly review', 'self review', 'manager review', 'ratings'],
    summary: 'Run structured performance appraisal cycles with employee self-evaluations and manager assessments.',
    steps: [
      'Navigate to **Performance** > **Performance Cycles**.',
      'Click **+ New Review Cycle** (e.g. Annual Appraisal 2026) and specify start/end evaluation periods.',
      'Employees complete self-assessments against assigned competencies.',
      'Managers submit performance scores, review notes, and recommendation for salary revision or promotion.'
    ],
    action: { label: 'Performance Cycles', path: '/performance/cycles' },
    related: ['performance-objectives', 'performance-surveys', 'documents-letters']
  },

  // --- ASSETS & HELPDESK ---
  {
    id: 'assets-management',
    title: 'Company Asset Inventory & Allocations',
    category: 'Assets & Helpdesk',
    keywords: ['assets', 'asset management', 'hardware', 'laptop', 'inventory', 'asset request', 'asset return'],
    summary: 'Track hardware, IT equipment, monitors, and vehicles with serial numbers and employee assignment history.',
    steps: [
      'Open **Assets** from the navigation sidebar.',
      'Click **+ Add Asset** to register equipment with Asset Code, Serial Number, Category, and Purchase Details.',
      'Assign the asset to an employee profile upon onboarding.',
      'Employees submit **Asset Requests** for replacement equipment or return assets upon offboarding.'
    ],
    action: { label: 'Go to Asset Inventory', path: '/assets' },
    related: ['helpdesk', 'onboarding', 'offboarding']
  },
  {
    id: 'helpdesk',
    title: 'Internal IT & HR Support Helpdesk',
    category: 'Assets & Helpdesk',
    keywords: ['helpdesk', 'support ticket', 'hr ticket', 'it support', 'raise ticket', 'issue', 'complaint'],
    summary: 'Staff can submit internal support tickets for HR questions, payroll discrepancies, or IT equipment issues.',
    steps: [
      'Go to **Helpdesk** from the sidebar and click **+ New Ticket**.',
      'Select Category (HR, IT Support, Payroll, Facility), Priority (Low, Medium, High, Urgent), and describe the request.',
      'Assigned agents reply, track resolution history, and update ticket status to Resolved.',
      'Common questions can also be browsed under **Helpdesk FAQ** (/helpdesk/faq).'
    ],
    action: { label: 'Open Support Helpdesk', path: '/helpdesk' },
    related: ['assets-management', 'attendance-regularisation', 'payroll-reimbursements']
  },

  // --- BILLING & SUBSCRIPTIONS ---
  {
    id: 'subscription-billing',
    title: 'Subscription Plans, Razorpay & 18% GST',
    category: 'Billing',
    keywords: ['subscription', 'plans', 'pricing', 'razorpay', 'gst', 'upgrade plan', 'billing', 'invoice', 'free tier'],
    summary: 'Manage your AccrueHRMS subscription tier with secure Razorpay checkout and compliant 18% GST debit calculation.',
    steps: [
      'Navigate to **Subscription** (/subscription) from the header or settings menu.',
      '**Available Plans:** Free (Up to 15 employees, Free Forever), Basic (₹999/mo), Standard (₹2,999/mo), Enterprise (₹6,999/mo).',
      'Choose **Monthly** or **Yearly** (Annual billing includes 2 months free discount).',
      'Click **Upgrade / Subscribe** to launch the Razorpay checkout. The payment debits Base Plan + 18% GST with auto-generated tax invoice.',
      'Your workspace tier updates immediately upon payment verification.'
    ],
    action: { label: 'Manage Subscription & Plans', path: '/subscription' },
    related: ['company-settings', 'getting-started', 'roles-permissions']
  },

  // --- SECURITY, EMAIL & SYSTEM ADMIN ---
  {
    id: 'email-templates',
    title: 'Automated Email Templates & SMTP Configuration',
    category: 'Settings',
    keywords: ['email templates', 'smtp', 'mail settings', 'email notification', 'welcome email', 'password email', 'sender name'],
    summary: 'Configure custom SMTP mail servers and customize branded notification templates for onboarding, leaves, and payslips.',
    steps: [
      'Navigate to **Companies** > **Email Templates** (/companies/email-templates).',
      'Inspect and customize system email templates: Welcome Onboarding Email, Password Reset, Leave Approval Notification, and Payslip Release.',
      'Templates feature responsive AccrueHRMS HTML layouts with your company logo and secure action buttons.',
      'View sent message status and delivery receipts under **Email Logs** (/companies/email-logs).'
    ],
    action: { label: 'Configure Email Templates', path: '/companies/email-templates' },
    related: ['company-settings', 'getting-started', 'onboarding']
  },
  {
    id: 'audit-logs',
    title: 'System Audit Logs & Compliance Trail',
    category: 'Security',
    keywords: ['audit log', 'audit trail', 'activity log', 'security log', 'who changed what', 'compliance log'],
    summary: 'Inspect immutable logs of all system operations, role changes, salary revisions, and login attempts.',
    steps: [
      'Open **Audit Logs** (/audit/logs) under Administration.',
      'Filter logs by User, Timestamp, Action (CREATE, UPDATE, DELETE), and Target Entity.',
      'All security-sensitive operations are recorded with IP address and exact payload modifications for compliance.'
    ],
    action: { label: 'View System Audit Logs', path: '/audit/logs' },
    related: ['roles-permissions', 'account-security', 'company-settings']
  },
  {
    id: 'account-security',
    title: 'Account Settings & Password Management',
    category: 'Security',
    keywords: ['change password', 'account settings', 'security', 'my profile', 'reset password', 'profile picture'],
    summary: 'Update personal login credentials, change your password, and configure profile details.',
    steps: [
      'Click your profile avatar in the top right corner and select **Account Settings** (/settings/account).',
      'To change password, enter Current Password, New Password, and Confirm New Password.',
      'Passwords must meet security policies (minimum 8 characters, numbers, and symbols).'
    ],
    action: { label: 'Account Settings', path: '/settings/account' },
    related: ['audit-logs', 'getting-started']
  }
]

// Personal self-service questions that fetch real-time employee data from the backend
export const PERSONAL_INTENTS = [
  { intent: 'LEAVE_BALANCE', label: 'My Leave Balance', keywords: ['leave balance', 'leave days', 'leaves left', 'pto', 'vacation balance', 'how many leave', 'how much leave', 'days left'] },
  { intent: 'LATEST_PAYSLIP', label: 'My Latest Payslip', keywords: ['my payslip', 'my pay slip', 'my salary', 'latest payslip', 'net pay', 'salary status', 'my salary slip', 'latest salary'] },
  { intent: 'ATTENDANCE_TODAY', label: "Today's Attendance", keywords: ['checked in', 'check in today', 'did i check in', 'am i checked in', 'attendance today', 'check-in today', 'punch status'] },
  { intent: 'PENDING_REGULARISATION', label: 'My Regularisation Requests', keywords: ['my regularisation', 'my regularization', 'regularisation status', 'pending regularisation', 'regularization pending'] },
  { intent: 'PENDING_LOAN', label: 'My Loan Requests', keywords: ['my loan', 'loan status', 'pending loan', 'my emi', 'loan application'] },
  { intent: 'PENDING_REIMBURSEMENT', label: 'My Reimbursements', keywords: ['my reimbursement', 'reimbursement status', 'my expense claim', 'pending reimbursement', 'expense status'] },
  { intent: 'NEXT_HOLIDAY', label: 'Next Upcoming Holiday', keywords: ['next holiday', 'upcoming holiday', 'when is holiday', 'next public holiday', 'holiday calendar'] },
]

/**
 * Normalizes query string into clean lowercase search tokens
 */
function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

/**
 * Evaluates whether a query is asking for personal employee data
 */
export function matchPersonalIntent(query) {
  const lower = (query || '').toLowerCase().trim()
  return PERSONAL_INTENTS.find(({ keywords }) =>
    keywords.some(k => lower.includes(k))
  )
}

/**
 * Searches the knowledge base using multi-keyword scoring
 */
export function searchAssistantKnowledge(query) {
  const cleanQuery = (query || '').trim()
  if (!cleanQuery) return null

  // 1. Check for personal intent first
  const personal = matchPersonalIntent(cleanQuery)
  if (personal) {
    return {
      type: 'PERSONAL_INTENT',
      intent: personal.intent,
      label: personal.label
    }
  }

  // 2. Score knowledge base topics
  const queryTokens = tokenize(cleanQuery)
  const lowerQuery = cleanQuery.toLowerCase()

  const scored = FEATURE_TOPICS.map(topic => {
    let score = 0
    const lowerTitle = topic.title.toLowerCase()
    const lowerSummary = topic.summary.toLowerCase()
    const lowerCategory = topic.category.toLowerCase()

    // Exact title match bonus
    if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
      score += 40
    }

    // Keyword match bonus
    topic.keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase()
      if (lowerQuery.includes(lowerKeyword)) {
        score += 25
      } else {
        const kwTokens = tokenize(lowerKeyword)
        const overlap = kwTokens.filter(t => queryTokens.includes(t))
        score += overlap.length * 8
      }
    })

    // Token overlap in title and summary
    queryTokens.forEach(token => {
      if (lowerTitle.includes(token)) score += 10
      if (lowerSummary.includes(token)) score += 5
      if (lowerCategory.includes(token)) score += 6
    })

    return { topic, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  if (best && best.score >= 12) {
    // Collect related topics
    const relatedTopics = (best.topic.related || [])
      .map(relId => FEATURE_TOPICS.find(t => t.id === relId))
      .filter(Boolean)
      .slice(0, 3)

    return {
      type: 'KNOWLEDGE_MATCH',
      topic: best.topic,
      related: relatedTopics
    }
  }

  // Fallback: Return top 3 suggested topics
  const fallbackSuggestions = scored
    .filter(s => s.score > 0)
    .slice(0, 3)
    .map(s => s.topic)

  return {
    type: 'NO_DIRECT_MATCH',
    suggestions: fallbackSuggestions.length > 0 ? fallbackSuggestions : FEATURE_TOPICS.slice(0, 3)
  }
}
