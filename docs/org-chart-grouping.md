# Org chart grouping

The selected company's active department configuration takes priority. If the
company has no departments and no employees have department assignments, the
chart groups by job position. Missing values appear in **Unassigned**.

Grouping headings organize siblings in the saved reporting-manager tree. They
are not managers or approval steps. Cross-department reports remain beneath
their actual manager, so a department heading can appear in more than one
reporting subtree. Removing visual headings reproduces the original employee
relationships exactly. Positions such as CEO and COO never fabricate hierarchy.

Only the selected company's chart and departments are requested, with explicit
company headers. Switching companies hides old data immediately and aborts old
requests. Invalid, failed, or mismatched responses show an error rather than
silently selecting a different grouping rule.

Search filters the grouped tree without changing the grouping mode. Counts
exclude visual headings. Existing palettes, cards, and page styling are retained.

This is a web-only presentation change. It does not edit employee records,
reporting managers, roles, approval permissions, or database schemas.
