On the super admin page it won’t let me edit anything except the product type and color.

Overall, the software is looking very strong and the core functionality is shaping up well. As we continue refining the platform, there are a few important adjustments we need to make to better accommodate our user base and how contractors and their teams will actually use the system in day-to-day operations. The items below outline those required enhancements clearly and in detail so they can be implemented accurately.



1. Product Pricing Structure

Goal:
Each product must support two different price levels, and each contractor user must be assigned to one pricing level at a time.

Price Types

For every product in the master product list, store:
	•	Contractor Price (standard)
	•	Preferred Contractor Price (discounted)

Both prices exist for the same product at all times.

⸻

2. User Pricing Assignment

Goal:
When creating or managing a contractor account, the admin must be able to control which price level that contractor sees.

Requirements:
	•	Each contractor user must be assigned one pricing tier:
	•	Contractor Pricing
	•	Preferred Contractor Pricing
	•	This assignment should be:
	•	A toggle, dropdown, or switch in the admin (master) login
	•	Changeable at any time by an admin
	•	When the pricing tier is changed:
	•	The contractor immediately sees only the prices from their assigned tier
	•	No other prices are visible to them

Example:
	•	Contractor A = Contractor Pricing → sees standard prices
	•	Contractor B = Preferred Pricing → sees discounted prices
	•	Admin can upgrade Contractor A to Preferred Pricing later with one click

⸻

3. Pricing Display Logic

Rule:
When a contractor logs in:
	•	The system checks their assigned pricing tier
	•	All product prices shown to them are pulled from that pricing tier only

No manual overrides per product—pricing is controlled only by the contractor’s assigned pricing tier.

⸻

4. Employee Accounts (Per Contractor)

Goal:
Contractors can add employees to their account with limited access.

Requirements:
	•	Contractors can create employee users under their company
	•	Employee permissions:
	•	View assigned jobs
	•	View inventory related to those jobs
	•	Cannot see pricing or account-level settings (unless explicitly allowed later)

⸻

5. Job Assignment System

Goal:
Employees should know exactly what jobs they are working on and what product they need.

Requirements:
	•	Admin or contractor can:
	•	Create jobs
	•	Assign one or more employees to a job
	•	When an employee logs in:
	•	They see only the jobs assigned to them
	•	For each job, they can see:
	•	Job details
	•	Required products
	•	Required quantities for that job/day

This allows employees to prepare materials without seeing pricing or unnecessary data.

⸻

6. Summary (One-Line Logic)
	•	Products have two price fields
	•	Contractors are assigned one pricing tier
	•	Pricing tier controls what prices they see
	•	Contractors can add employees
	•	Employees are assigned to jobs
	•	Employees see their jobs + required inventory only