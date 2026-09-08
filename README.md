# Solo Finance Command

SOLOOS — MASTER BUILD PROMPT

Product

Build SoloOS, a production-grade financial operating system for freelancers, consultants, creators, contractors, independent professionals, and small solo businesses.

Product positioning

SoloOS
The financial operating system for independent professionals.

Core promise:

Know what you earned. Know what you keep. Know what to do next.

SoloOS is NOT simply:

an invoicing app

an expense tracker

an accounting dashboard

a budgeting app

a CRM

an AI chatbot

It combines these capabilities into one coherent financial command center.

The user should feel that SoloOS is the place where they can understand and run the financial side of their independent business.

1. CORE PRODUCT EXPERIENCE

The fundamental product loop is:

Capture → Understand → Decide → Act → Measure

A user records or imports business activity.

SoloOS converts those events into authoritative financial state.

The system explains what is happening.

The system identifies important issues.

The system recommends actions.

The user takes action.

The system measures the resulting impact.

The experience should therefore be decision-oriented rather than accounting-oriented.

The product should constantly answer:

What do I have?

What did I earn?

What did I actually keep?

Who owes me?

Where is my money going?

Which clients and projects are profitable?

What bills and obligations are coming?

How much should I reserve for taxes?

How much can I safely spend?

What should I do next?

2. PRODUCT PRINCIPLES

These principles are mandatory.

2.1 Financial truth comes first

Never create fake financial numbers.

Never hardcode dashboard metrics.

Never use random mock data in production screens.

Every financial metric must ultimately derive from authoritative persisted data.

2.2 One source of truth

Do not maintain separate competing calculations for:

revenue

expenses

profit

cash

receivables

payables

project profitability

client profitability

taxes

Create a coherent domain model and reusable calculation/query layer.

The Command Center reads from that authoritative model.

2.3 Transactions are authoritative

Financially meaningful operations must be persisted transactionally.

Examples:

recording an income transaction

recording an expense

recording an invoice

recording an invoice payment

recording a refund

recording an account transfer

recording a project expense

recording a tax reserve

recording a withdrawal

If an operation changes multiple related financial records, use database transactions/RPCs or equivalent atomic server-side operations.

Do not rely on a sequence of independent client-side mutations for critical financial operations.

2.4 Never silently rewrite history

Do not destructively modify historical financial records when that would destroy auditability.

Prefer:

reversals

corrections

adjustment transactions

void states

credit notes

refund transactions

Every meaningful financial change should be traceable.

2.5 Database security is authoritative

Never rely exclusively on frontend authorization.

Implement tenant/workspace isolation and authorization at the database level.

Use Supabase Row Level Security where applicable.

2.6 The UI should not feel like ERP software

The underlying architecture can be sophisticated.

The user experience must be:

simple

calm

premium

modern

fast

understandable

action-oriented

Avoid dense accounting jargon unless the user is inside a financial report.

3. TARGET USERS

Primary users:

freelancers

software developers

designers

marketers

consultants

photographers

writers

creators

contractors

coaches

independent agencies

solo business owners

The system should support both service-based professionals and people who sell digital/physical services or products without becoming a traditional inventory ERP.

4. TECHNOLOGY STACK

Use the existing Lovable-supported modern web stack.

Preferred architecture:

React

TypeScript

Vite

TanStack Query

Supabase

PostgreSQL

Supabase Auth

Supabase Storage where needed

Supabase Edge Functions where server-side execution is appropriate

shadcn/ui

Tailwind CSS

Lucide icons

Use strict TypeScript.

Avoid unnecessary dependencies.

Use reusable domain components and hooks.

Keep business logic out of presentational components.

5. MULTI-TENANCY

SoloOS must be multi-tenant from the beginning.

Use a workspace/business model.

A user belongs to one or more workspaces.

All business data must belong to a workspace.

Every tenant-owned table must contain an appropriate workspace/business identifier.

Never assume that the authenticated user's ID alone is sufficient for authorization.

Implement:

users/profiles

workspaces

workspace memberships

roles

permissions

workspace settings

All tenant data must be protected with RLS.

Users must never be able to read, insert, update, or delete another workspace's data.

Test tenant isolation explicitly.

6. AUTHENTICATION

Implement real authentication using Supabase Auth.

Support:

sign up

sign in

sign out

password reset

session persistence

protected routes

email verification where supported

onboarding

Do not create fake authentication.

Handle:

loading state

expired sessions

unauthorized state

authentication errors

network errors

7. ONBOARDING

Create a polished onboarding flow.

Collect:

Business identity

business/workspace name

business type

country

timezone

default currency

financial year start

Professional profile

name

email

optional phone

profession/category

Financial preferences

tax mode/profile

preferred invoice payment terms

default invoice settings

Initial setup

Allow users to optionally create:

first financial account

first client

first project

The user should be able to skip optional steps.

Onboarding must create real persisted records.

8. APPLICATION SHELL

Build a premium responsive application shell.

Desktop:

left sidebar

top contextual header

workspace switcher if applicable

global search

notifications

user menu

Mobile:

compact header

bottom navigation or responsive navigation

accessible mobile menus

Navigation:

Command Center

Clients

Projects

Invoices

Payments

Expenses

Cash

Profitability

Taxes

Reports

Insights

AI CFO

Settings

Use Lucide icons consistently.

Do not use excessive visual decoration.

Use typography and spacing to create hierarchy.

The product should feel like a serious financial product, not a generic admin template.

9. COMMAND CENTER

This is the heart of SoloOS.

Route:

/app

The Command Center should answer the user's most important financial questions immediately.

Primary financial cards

Display:

Revenue

Current period revenue.

Expenses

Current period expenses.

Net income

Revenue minus recognized expenses according to the application's financial model.

Cash

Current available cash across financial accounts.

Outstanding

Outstanding accounts receivable.

Safe to spend

Calculated amount available after considering:

current available cash

committed upcoming obligations

tax reserve

required operating buffer

optionally expected reliable collections

Do NOT make this a hardcoded number.

10. COMMAND CENTER SECTIONS

Financial overview

Include:

revenue trend

expense trend

net income trend

cash trend

Allow date ranges:

this week

this month

this quarter

this year

custom

Allow comparison against:

previous period

previous year where sufficient data exists

Cash position

Show:

total cash

account breakdown

upcoming outflows

expected inflows

projected balance

Receivables

Show:

outstanding amount

overdue amount

overdue invoices

aging summary

Business performance

Show:

top clients

top projects

most profitable projects

lowest-margin projects

Action Center

Prioritize actionable issues.

Examples:

invoice overdue

invoice approaching due date

unusual expense

tax reserve required

cashflow risk

project margin deterioration

unusually high spending

subscription increase

client concentration risk

Each action should provide an appropriate CTA.

Examples:

Send reminder

Record payment

Review expense

View project

Create reserve

View forecast

11. BUSINESS HEALTH

Create an explainable financial health system.

Potential dimensions:

Cash health

Profitability health

Receivables health

Expense health

Tax readiness

Revenue stability

Do not create a meaningless arbitrary score.

If displaying an overall health score, the calculation must be deterministic and explainable.

The user must be able to understand:

Why is my financial health rated this way?

12. CLIENTS

Create full client management.

Client fields:

name

company

email

phone

address

country

tax/business identifier where applicable

currency

payment terms

notes

status

Client detail page should show:

lifetime revenue

outstanding balance

overdue balance

projects

invoices

payments

expenses attributable to client

profitability

payment behavior

activity timeline

Allow:

create

edit

archive

restore

search

filter

sort

Do not permanently delete historical client relationships if referenced by financial records.

13. PROJECTS

Projects are financial objects, not merely task records.

Project fields:

name

client

description

status

start date

due date

budget

agreed fee

currency

target margin

estimated hours

actual hours

notes

Project statuses:

Lead

Proposal

Active

Completed

Cancelled

On Hold

Track:

revenue

expenses

profit

margin

hours

effective hourly rate

Project detail should provide:

Financial summary

Revenue
Expenses
Profit
Margin
Effective hourly rate

Activity

Invoices
Payments
Expenses
Notes

Performance

Budget vs actual.

14. PROJECT PROFITABILITY

Create an authoritative profitability engine.

For each project calculate:

Revenue
− direct project expenses
− allocated applicable costs where configured
= project profit

Then:

profit / revenue = margin

If hours are tracked:

profit / actual hours = effective hourly profit

And:

revenue / actual hours = effective hourly revenue

Clearly distinguish between:

revenue

profit

effective hourly revenue

effective hourly profit

Do not present misleading calculations.

15. INVOICING

Implement a real invoice system.

Invoice fields:

invoice number

client

project

issue date

due date

currency

line items

subtotal

discount

tax

total

notes

payment instructions

status

Statuses:

Draft

Sent

Viewed where tracking is implemented

Partially Paid

Paid

Overdue

Void

Cancelled

Support:

invoice creation

editing while draft

sending

PDF generation

downloading

printing

payment recording

partial payments

voiding

overdue detection

reminders

Do not fake email delivery.

If email delivery is implemented, use a real provider/server-side function.

16. PAYMENTS

Create a payment model independent from invoices.

Payment fields:

amount

currency

date

client

invoice

account

payment method

reference

notes

Payment methods may include:

Bank transfer

Cash

Card

PayPal

Stripe

Mobile money

Other

Support:

full payment

partial payment

payment allocation

unallocated client payment where appropriate

refunds

Payment recording must update the appropriate financial state atomically.

17. EXPENSES

Create a robust expense system.

Fields:

amount

currency

date

category

vendor/payee

description

account

project

client

tax

receipt

recurring flag

notes

Support:

create

edit

categorize

attach receipt

mark billable

associate with project

associate with client

recurring expenses

archive/reversal

Receipt files should use Supabase Storage securely.

Do not expose private receipt files publicly.

18. FINANCIAL ACCOUNTS

Create accounts representing where money exists.

Examples:

Bank account

Cash

Mobile money

Payment processor

Digital wallet

Other

Account fields:

name

type

currency

opening balance

current balance

status

Support:

deposits/income

expenses

transfers

adjustments

reconciliation foundation

Account balances should derive from authoritative transactions wherever practical.

Do not allow arbitrary frontend balance mutation.

19. TRANSACTION ENGINE

Build a foundational financial transaction model.

Transactions should support appropriate types such as:

income

expense

transfer

payment received

refund

withdrawal

tax reserve

adjustment

Every transaction should have:

ID

workspace

date/time

amount

currency

type

account

category where applicable

client/project references where applicable

source/reference

description

created by

created at

updated at

status

reversal/reference metadata where applicable

Use appropriate PostgreSQL numeric/decimal types for money.

Never use floating-point arithmetic for authoritative monetary calculations.

20. DOUBLE-ENTRY-READY ARCHITECTURE

Structure the financial model so it can evolve toward full double-entry accounting.

Even if the first release presents simplified user-facing financial transactions, avoid designing a dead-end schema.

Financial records should be traceable to their source event.

Build reusable server-side calculation/query functions.

21. RECEIVABLES

Create accounts receivable management.

Show:

total outstanding

current

1–30 days overdue

31–60

61–90

90+ days

Provide:

invoice aging

client aging

collection priority

overdue actions

The system should detect overdue invoices automatically based on due date.

22. PAYABLES / COMMITTED EXPENSES

Freelancers often have future obligations.

Support payable/commitment concepts where appropriate.

Examples:

contractor invoice

software subscription

rent

upcoming business expense

tax obligation

Track:

amount

due date

status

vendor

category

account if paid

This data feeds cashflow and safe-to-spend calculations.

23. CASHFLOW

Build a cashflow command center.

Historical:

inflows

outflows

net cash movement

ending cash

Forecast:

7 days

30 days

60 days

90 days

Forecast should consider:

recurring income

recurring expenses

unpaid invoices

committed obligations

tax reserves

expected payment timing where available

Clearly distinguish:

actual

scheduled

expected

forecast

Never present forecasts as facts.

24. SAFE-TO-SPEND ENGINE

This is a signature SoloOS feature.

Calculate a user-facing safe-to-spend amount.

Base model:

Available Cash
− Committed Upcoming Obligations
− Required Tax Reserve
− Operating Buffer

Reliable Expected Collections

The exact calculation must be transparent and configurable.

Provide an explanation UI.

Example:

Safe to spend: $2,840

Breakdown:

Cash: $6,500
Upcoming obligations: −$900
Tax reserve: −$1,200
Operating buffer: −$1,000
Reliable collections: +$560

Result:

$3,960

Use actual data.

Never hardcode example numbers in the production dashboard.

Allow users to configure their preferred operating buffer.

25. “CAN I AFFORD THIS?” SCENARIO ENGINE

Create a scenario tool.

User enters:

Purchase: $1,500

System evaluates:

current cash

safe-to-spend

upcoming obligations

tax reserves

projected cash

operating buffer

Return:

affordable now

affordable later

not recommended

Explain why.

Example:

You can afford this purchase, but buying it today would reduce your operating buffer below your preferred level.

Allow scenarios such as:

purchase equipment

hire contractor

take a vacation

increase subscription costs

withdraw money

reduce expenses

26. TAX CENTER

Build a tax planning foundation.

Do not pretend to provide jurisdiction-specific tax advice unless properly configured.

Allow:

tax profile

tax rate assumptions

tax reserve percentage

taxable income estimates

tax reserve balance

upcoming tax obligations

Show:

estimated tax

reserved tax

remaining reserve needed

Clearly label estimates.

Provide a disclaimer where appropriate that tax calculations are estimates and users should verify applicable local requirements.

27. PROFITABILITY CENTER

Create a dedicated profitability area.

Show:

gross revenue

expenses

net income

margin

revenue by client

profit by client

revenue by project

profit by project

effective hourly rates

expense categories

recurring expense burden

Allow filtering by:

date

client

project

category

currency

28. PRICING INTELLIGENCE

Create a pricing analysis foundation.

For projects, calculate:

revenue

costs

profit

margin

actual hourly revenue

actual hourly profit

Allow users to define:

target hourly rate

target margin

desired monthly income

Use these to provide recommendations.

Example:

Your last five projects averaged $34/hour. Your target is $50/hour.

Potential recommendation:

Consider increasing project pricing by approximately 32% to reach your target rate, assuming similar hours and costs.

Clearly label recommendations as estimates.

29. REPORTS

Create a professional reporting center.

Reports:

Financial

Profit & Loss

Income summary

Expense summary

Cashflow

Account balances

Receivables

AR aging

Outstanding invoices

Client balances

Projects

Project profitability

Project revenue

Project expenses

effective hourly rate

Clients

client revenue

client profitability

outstanding balances

Expenses

category breakdown

recurring expenses

monthly trends

Support:

date filters

client filters

project filters

account filters

currency filters where appropriate

export

Exports should be generated from authoritative data.

30. CSV IMPORT / EXPORT

Build reliable CSV workflows.

Import candidates:

transactions

expenses

clients

invoices

payments

Import flow:

Upload

Detect columns

Map columns

Validate

Show preview

Identify errors

Confirm import

Process server-side

Show results

Never partially import silently.

Report:

successful rows

failed rows

reasons

duplicates where detected

Support CSV export for important lists and reports.

31. SEARCH

Create global search.

Search across:

clients

projects

invoices

payments

expenses

transactions

Results should be grouped by entity.

Include keyboard-friendly navigation where practical.

32. NOTIFICATIONS

Build a notification system.

Potential notifications:

invoice overdue

invoice due soon

payment received

unusual expense

low cash buffer

tax reserve required

forecast risk

project margin deterioration

Notifications should be generated from real events/rules.

Avoid notification spam.

Allow read/unread state.

33. INSIGHTS ENGINE

Build deterministic financial insights before introducing AI.

Examples:

Revenue

Revenue increased 18% compared with the previous period.

Margin

Your average project margin declined from 72% to 61%.

Receivables

$2,400 is currently overdue across three invoices.

Expenses

Software expenses increased 27% this month.

Client concentration

54% of your revenue this quarter came from one client.

Cashflow

Your projected cash balance may fall below your operating buffer in 18 days.

Every insight must be derived from actual data.

Every insight should include:

title

explanation

severity

relevant metric

timestamp

CTA where applicable

34. AI CFO

Build the architecture for an AI financial assistant.

Name:

AI CFO

The AI must NOT invent financial information.

It should only reason over authoritative application data made available through controlled tools/queries.

Example questions:

Why did my profit fall?

Who owes me money?

Which clients are most profitable?

Which projects are underperforming?

Can I afford this purchase?

How much should I reserve for taxes?

What are my biggest expenses?

What will my cash look like next month?

Which client contributes most to my revenue?

What should I focus on this week?

Architecture:

User question
→ intent detection
→ authorized financial data retrieval
→ calculations
→ model reasoning
→ response with supporting numbers
→ source/context references where possible

Never allow the model to fabricate values.

If insufficient data exists, say so.

Example:

I don't have enough transaction history to make a reliable forecast yet.

35. AI ACTIONS

Eventually allow the AI CFO to suggest actions.

Potential actions:

create invoice

draft reminder

categorize expense

create forecast scenario

identify overdue invoices

prepare financial summary

Actions that change financial state must require explicit user confirmation.

Never let an AI model silently mutate financial records.

36. ACTIVITY TIMELINE

Create a unified business activity timeline.

Events can include:

client created

project created

invoice created

invoice sent

payment received

expense recorded

transaction recorded

invoice overdue

tax reserve created

insight generated

Use this for context on:

clients

projects

invoices

accounts

Command Center

37. AUDIT LOG

Create an audit log.

Track meaningful actions:

create

update

archive

void

reverse

payment

invoice status changes

permission changes

settings changes

Store:

workspace

actor

action

entity

entity ID

timestamp

metadata where appropriate

Audit records should not be user-editable.

38. ROLE-BASED ACCESS

Implement roles such as:

Owner

Admin

Finance

Manager

Viewer

Use least-privilege permissions.

Examples:

Viewer:

read-only

Finance:

financial operations

Manager:

operational management

Owner/Admin:

workspace configuration and full access

Enforce authorization server-side/database-side.

39. CURRENCY

Build multi-currency readiness.

Every financial record must have an explicit currency.

Workspace has a default currency.

Do not silently mix currencies.

For MVP:

support the workspace's default currency fully

allow multiple currency records structurally

clearly separate currencies in calculations

Do not aggregate different currencies without conversion.

Create a future-ready exchange-rate abstraction.

40. FINANCIAL PRECISION

This is critical.

Use PostgreSQL numeric/decimal types.

Do not use JavaScript floating-point values as the authoritative representation of money.

Define consistent rounding rules.

Store:

amount

currency

precision where appropriate

Centralize monetary calculations.

41. DATA INTEGRITY

Use:

foreign keys

unique constraints

check constraints

not-null constraints where appropriate

indexes

transactional operations

server-side validation

Prevent:

negative invalid balances where prohibited

orphaned financial records

duplicate invoice numbers within a workspace

cross-workspace references

invalid payment allocations

overpayment without explicit support

impossible invoice states

42. DATABASE INDEXING

Index common access paths:

workspace ID

client ID

project ID

invoice ID

account ID

transaction date

invoice due date

transaction type

status

created_at

Optimize based on actual query patterns.

43. RESPONSIVE DESIGN

The application must work exceptionally well on:

desktop

laptop

tablet

mobile

Do not simply shrink desktop UI.

For mobile:

prioritize Command Center

simplify tables

use cards/list views

provide mobile-friendly forms

maintain fast access to key actions

44. ACCESSIBILITY

Implement:

semantic HTML

keyboard navigation

visible focus states

accessible labels

proper contrast

screen-reader-friendly controls

accessible dialogs

accessible form errors

Do not rely on color alone to communicate status.

45. UI DESIGN DIRECTION

Create a premium financial product aesthetic.

Avoid:

generic SaaS gradients everywhere

excessive glassmorphism

noisy dashboards

giant hero illustrations inside the application

excessive rounded cards

unnecessary animations

generic AI-dashboard styling

visual clutter

Prefer:

strong typography

generous spacing

subtle borders

restrained elevation

clear hierarchy

meaningful charts

compact but readable data presentation

calm financial colors

excellent empty states

The UI should feel trustworthy.

It should feel like software people would trust with their money.

46. TYPOGRAPHY

Do not default to:

Inter

Roboto

Arial

Open Sans

Lato

Prefer a distinctive modern typeface such as:

Bricolage Grotesque

Space Grotesk

Clash Display

Use typography intentionally.

47. DASHBOARD UX

Do not overload the Command Center.

Hierarchy:

Level 1

What is my financial position?

Level 2

What changed?

Level 3

What requires attention?

Level 4

What should I do?

Level 5

How can I investigate further?

This hierarchy should be visible in the interface.

48. EMPTY STATES

Do not display blank dashboards.

If there is no data:

Explain what the user can do next.

Example:

You haven't recorded any income yet.

CTA:

Record income

For a new user:

Let's get your financial command center running.

Actions:

Add your first client

Create a project

Record income

Add an expense

Connect an account

Do not populate the user's business with fake transactions.

49. LOADING AND ERROR STATES

Every data-dependent screen needs:

loading state

empty state

error state

retry option where appropriate

Do not leave blank white screens.

Handle:

network failures

auth expiration

permission errors

validation errors

server errors

Use clear human language.

50. FORMS

Forms must be production quality.

Include:

validation

field-level errors

required indicators

sensible defaults

duplicate-submit protection

loading states

success feedback

error feedback

Never allow users to submit the same critical financial action multiple times because of repeated clicks.

51. DELETE / ARCHIVE POLICY

Avoid destructive deletion for records referenced by financial history.

Use:

archive

void

cancel

reverse

correction

Historical financial records must remain auditable.

52. CONCURRENCY

Critical operations must be safe under concurrent requests.

Examples:

payment recording

invoice payment allocation

account balance updates

transaction creation

reversals

Use database constraints and transactional operations.

Do not rely on frontend checks for concurrency protection.

53. PERFORMANCE

Use TanStack Query appropriately.

Implement:

caching

invalidation

pagination

server-side filtering

debounced search

lazy loading where appropriate

Do not fetch entire tables when only a page is required.

Avoid unnecessary rerenders.

54. SECURITY

Implement:

Supabase RLS

authenticated protected routes

server-side validation

tenant isolation

least privilege

secure storage access

no sensitive financial data in logs

no secrets in frontend code

environment variables for credentials

safe error handling

Never expose service-role keys to the browser.

55. OBSERVABILITY

Create foundations for:

structured error handling

application logging

audit events

important operation failures

Critical server-side operations should produce useful diagnostics without exposing sensitive information.

56. BILLING ARCHITECTURE

Do not necessarily implement paid subscriptions in the first phase.

However, structure the workspace/account model so future billing can support:

Free

Pro

Business

Potential future limits:

number of clients

invoices

projects

AI usage

integrations

financial history

exports

Do not hardcode pricing into domain logic.

57. FUTURE INTEGRATIONS

Design extension points for:

Stripe

PayPal

Wise

Payoneer

bank feeds

payment gateways

accounting platforms

email

WhatsApp

calendar

Do not implement fake integrations.

If an integration is not configured, clearly indicate that it is unavailable.

58. GLOBAL SEARCH + COMMAND ACTIONS

Eventually support a command palette.

Examples:

Create invoice

Record payment

Add expense

Add client

Create project

View overdue invoices

Ask AI CFO

Use keyboard shortcuts where appropriate.

59. DOMAIN MODEL

Create a coherent database model around entities such as:

profiles

workspaces

memberships

roles

workspace_settings

clients

projects

project_members if needed

invoices

invoice_items

payments

payment_allocations

expenses

expense_categories

financial_accounts

financial_transactions

transaction_categories

transfers

tax_profiles

tax_reserves

commitments/payables

recurring_transactions

insights

notifications

audit_logs

attachments

activity_events

Adapt the schema where necessary.

Do not create redundant tables merely to satisfy the list.

The final schema must be internally coherent.

60. IMPORTANT RELATIONSHIP RULES

Examples:

An invoice belongs to:

workspace

client

optionally project

An invoice contains:

invoice items

A payment belongs to:

workspace

client

financial account

A payment can be allocated to:

one or more invoices

An expense belongs to:

workspace

account

category

optionally project

optionally client

A financial transaction belongs to:

workspace

account

Projects belong to:

workspace

client

All relationships must respect workspace boundaries.

61. AUTHORITATIVE CALCULATIONS

Create centralized calculations for:

Revenue

Sum valid recognized income according to the chosen financial model.

Expenses

Sum valid expense transactions.

Net income

Revenue − expenses.

Outstanding receivables

Valid invoice totals − allocated payments.

Account balance

Opening balance + authoritative transactions.

Project revenue

Revenue attributed to project.

Project expenses

Expenses attributed to project.

Project profit

Project revenue − project expenses.

Margin

Profit / revenue.

Cashflow

Actual inflows − actual outflows.

Safe-to-spend

Configured safe-spend calculation.

These calculations must be reusable across:

dashboard

reports

insights

AI CFO

exports

Do not duplicate formulas in multiple frontend components.

62. TESTING

Create meaningful tests for critical logic.

At minimum test:

Authentication

protected routes

session handling

Tenant isolation

workspace A cannot access workspace B

Financial transactions

creation

validation

reversal

Invoices

totals

taxes

payments

partial payments

overdue state

Receivables

aging

allocation

outstanding totals

Expenses

totals

project association

categories

Accounts

balances

transfers

Profitability

project revenue

expenses

margin

hourly calculations

Safe-to-spend

obligations

reserves

buffers

expected collections

Forecasting

actual vs projected

forecast windows

Permissions

role restrictions

Concurrency

duplicate payment attempts

concurrent financial operations

63. NO FAKE FUNCTIONALITY

This rule is absolute.

Do not:

fake payments

fake invoices

fake AI answers

fake dashboard metrics

fake forecasts

fake charts

fake notifications

fake authentication

fake integrations

hardcode sample numbers into production views

If functionality cannot yet be implemented, build a clean placeholder state and clearly mark it as unavailable.

64. NO PRETEND COMPLETION

Do not claim a feature is complete if only the UI exists.

A feature is complete only when:

UI → validation → server operation → database → authorization → calculations → UI refresh

works correctly.

65. BUILD ORDER

Build the system in controlled phases.

PHASE 1 — FOUNDATION

Implement:

project architecture

auth

workspace

memberships

roles

RLS

onboarding

settings

app shell

protected routing

base domain architecture

Do not rush into advanced dashboards before the foundation is correct.

PHASE 2 — FINANCIAL ENGINE

Implement:

financial accounts

transaction model

transaction categories

income

expenses

transfers

authoritative balance calculations

audit trail

PHASE 3 — CLIENTS + PROJECTS

Implement:

clients

projects

project financial attribution

activity timeline

PHASE 4 — INVOICING + PAYMENTS

Implement:

invoices

invoice items

payment recording

payment allocation

receivables

aging

overdue logic

PHASE 5 — COMMAND CENTER

Implement:

financial overview

cash

revenue

expenses

net income

receivables

safe-to-spend

action center

PHASE 6 — PROFITABILITY

Implement:

project profitability

client profitability

margins

effective hourly rates

pricing intelligence

PHASE 7 — CASHFLOW + TAX

Implement:

cashflow history

30/60/90-day forecast

commitments

tax reserves

tax estimates

affordability scenarios

PHASE 8 — REPORTS + INSIGHTS

Implement:

reporting center

exports

deterministic insights

notifications

PHASE 9 — AI CFO

Implement:

financial query tools

controlled data access

AI reasoning

explanations

scenario analysis

action suggestions

PHASE 10 — INTEGRATIONS

Implement real integrations only when credentials/configuration are available.

PHASE 11 — PRODUCTION HARDENING

Perform:

RLS audit

authorization audit

financial reconciliation

concurrency testing

performance optimization

error handling

accessibility review

responsive review

security review

automated testing

data integrity review

66. FIRST EXECUTION TASK

Do NOT attempt to implement every phase in one pass.

First inspect the existing repository.

Determine:

current files

existing dependencies

existing Supabase configuration

current schema

existing routes

existing components

existing authentication

existing environment configuration

Preserve useful existing infrastructure.

Do not unnecessarily rewrite working systems.

Then implement Phase 1: Foundation.

Before moving to later phases, ensure:

authentication works

workspace creation works

onboarding works

memberships work

roles work

RLS works

protected routing works

settings persist

app shell works

no cross-tenant data access is possible

67. ENGINEERING DISCIPLINE

When implementing each phase:

Inspect existing implementation.

Reuse working infrastructure.

Define/verify data model.

Implement database constraints and RLS.

Implement server-side/domain operations.

Implement query layer.

Implement UI.

Connect UI to real data.

Handle loading/error/empty states.

Test critical paths.

Verify tenant isolation.

Verify financial calculations.

Only then move forward.

Do not generate large amounts of UI disconnected from the data model.

68. FINAL PRODUCT STANDARD

SoloOS should feel like a product that a serious freelancer could trust with their financial operations.

It should answer:

Where am I financially?

What changed?

Why did it change?

What is coming?

What can I safely spend?

What should I do next?

The product should transform financial data into decisions.

The core experience is:

Capture → Understand → Decide → Act → Measure

And the north-star experience is:

Here's where you stand. Here's what's changing. Here's what matters. Here's what you should do next.

Build SoloOS as a real, production-grade application.

Do not build a mockup.

Do not build a static dashboard.

Do not create fake data.

Do not create fake functionality.

Build the actual financial operating system.  ENGINEERING ROLE AND STANDARD

You are acting as the World-Class Principal Engineer, Staff Product Engineer, and Technical Lead responsible for building SoloOS to production-grade standards.

Do not approach this project as a UI generation task.

Approach it as if you are the senior technical owner responsible for taking SoloOS from architecture through production deployment and long-term maintainability.

You are expected to think deeply before implementing.

For every feature, consider:

architecture

data modeling

domain boundaries

financial correctness

database integrity

authorization

tenant isolation

concurrency

performance

scalability

observability

accessibility

responsive behavior

maintainability

failure states

edge cases

testing

future extensibility

ENGINEERING JUDGMENT

Do not blindly implement instructions when doing so would create an architectural problem.

Use senior engineering judgment while preserving the product requirements in this specification.

If an implementation detail is unspecified, choose the solution that would be appropriate for a serious production SaaS.

Prefer:

simple architectures over unnecessarily complex ones

explicit domain models over implicit behavior

authoritative server-side state over client-maintained state

database constraints over frontend assumptions

transactional operations over sequences of fragile mutations

reusable domain logic over duplicated calculations

composable components over monolithic components

typed interfaces over unstructured data

predictable state transitions over arbitrary status changes

auditable operations over destructive mutations

secure defaults over permissive defaults

Do not introduce unnecessary technologies simply because they are available.

Do not over-engineer prematurely.

At the same time, do not take shortcuts that compromise financial correctness, security, data integrity, or long-term maintainability.

THINK BEFORE YOU BUILD

Before implementing a major feature:

Understand the existing architecture.

Identify the domain entities involved.

Identify the authoritative source of truth.

Determine how the feature affects existing financial state.

Determine authorization requirements.

Determine transaction/concurrency requirements.

Determine failure and rollback behavior.

Determine how the feature will be queried and reported.

Determine how the UI will represent loading, empty, error, and success states.

Determine how the feature will be tested.

Then implement it.

PRESERVE EXISTING WORK

Before changing existing code:

inspect it

understand why it exists

identify its dependencies

determine whether it is already correct

modify only what is necessary

Do not rewrite working infrastructure merely to impose a preferred coding style.

Do not replace an existing implementation without a clear technical reason.

NO SHORTCUT ENGINEERING

Never solve a difficult backend or financial requirement by moving the problem into the frontend.

Never solve an authorization requirement with UI hiding.

Never solve a consistency requirement with optimistic assumptions.

Never solve a financial calculation by duplicating formulas across components.

Never solve a missing backend capability by hardcoding a value.

Never simulate a production capability just to make a screen appear complete.

FINANCIAL SYSTEM STANDARD

Treat financial data as high-integrity data.

Assume that users may rely on SoloOS to make real financial decisions.

Therefore:

monetary calculations must be precise

financial state must be traceable

critical operations must be atomic

historical records must be auditable

reversals must preserve history

calculations must be deterministic

financial metrics must reconcile

currencies must be explicit

authorization must be enforced at the database/server level

concurrent operations must be safe

If there is a conflict between visual convenience and financial correctness, financial correctness wins.

PRODUCTION MINDSET

Build every completed feature as though it will be used by thousands of real users.

That does not mean prematurely optimizing everything.

It means avoiding fragile implementations that will obviously become problems later.

Think about:

indexes

pagination

query efficiency

caching

race conditions

retries

duplicate submissions

idempotency

partial failures

stale state

authorization

data migrations

backward compatibility

error recovery

where relevant.

PRODUCT + ENGINEERING BALANCE

SoloOS must be technically sophisticated underneath while remaining extremely simple for the user.

Do not expose unnecessary technical or accounting complexity in the UX.

The user should experience:

Clarity, confidence, and control.

The engineering complexity belongs underneath the product.

OWN THE OUTCOME

Do not optimize for "code generated."

Optimize for:

A complete, reliable, maintainable, production-ready product.

A feature is not complete because:

the page exists

the button exists

the modal opens

the database table exists

a mutation runs once

sample data appears

A feature is complete when the entire flow works correctly:

User action → validation → authorization → server/domain operation → database → authoritative state → derived calculations → UI update → auditability → error handling

When appropriate, verify the complete flow before considering the feature finished.

SELF-REVIEW

After each significant implementation, perform a senior-engineer review of your own work.

Ask:

Is the data model correct?

Is tenant isolation guaranteed?

Can unauthorized users access this?

Can duplicate operations occur?

Can concurrent operations corrupt state?

Are financial calculations authoritative?

Are there hidden hardcoded values?

Are errors handled?

Are loading and empty states handled?

Is the mobile experience correct?

Is the implementation unnecessarily complex?

Is there duplicated business logic?

Will this be maintainable six months from now?

Can the feature be tested reliably?

Fix issues you identify before moving on.

QUALITY BAR

The standard is not "good enough for a prototype."

The standard is:

World-class product engineering.

Build SoloOS as if you are the principal engineer whose name is attached to the architecture, security, financial correctness, and reliability of the entire system.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7821a1e3-36bc-41d1-abd1-113f4a6f622a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
