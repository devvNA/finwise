# Finwise

Personal finance and credit simulation app for Indonesian beginners. Use HTML5, CSS3, and vanilla ES6 modules only.

## Structure
- `index.html` contains the application shell and accessible semantic structure.
- `css/style.css` owns responsive styling and design tokens.
- `js/app.js` coordinates navigation, rendering, UI events, charts, and reports.
- `js/calculator.js` owns loan, card, PayLater, Pindar, and amortization calculations.
- `js/finance.js` owns dashboard metrics, affordability, emergency-fund planning, and recommendations.
- `js/comparison.js` owns up-to-five-offer comparison and ranking.
- `js/storage.js` owns all LocalStorage reads and writes.
- `README.md` explains local use, calculations, limitations, and privacy.

## Commands
- Serve locally: `python -m http.server 8000`

## Rules
- Keep the app build-free. Do not add frameworks, TypeScript, a backend, a database, or package dependencies.
- Use ES modules with focused, reusable functions. Keep financial calculations independent from DOM code.
- Keep money as unformatted numeric values during calculations. Format only at rendering with `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.
- Validate empty, non-finite, negative, and zero-divisor inputs before calculating. Tenor must be greater than zero, and down payment cannot exceed the item price.
- Recalculate all dependent results, charts, recommendations, and statuses whenever relevant inputs change.
- Save user preferences, form state, and named simulations through `js/storage.js`. Confirm before deleting saved history.
- Implement all controls as working behavior. Do not leave placeholder buttons, static result values, or unlabelled simulated product rates.
- Show finance guidance as an educational simulation, never as credit approval, legal advice, or a real provider offer.
- Keep official regulatory facts separate from app guidance. Do not invent product terms, fees, interest limits, fines, or regulations.

## Financial Requirements
- Affordability uses both debt-to-income and disposable income. Do not approve an installment from income ratio alone.
- New-installment capacity is `max(0, min(incomeCap - existingInstallments, disposableIncome))`.
- Support flat, effective annuity, and daily simple interest. For 0% interest, divide principal evenly across periods.
- Generate consistent amortization schedules for the chosen payment interval, including principal, interest, balance, and due date.
- Compare at most five offers by total cost, periodic installment, tenor, down payment, and affordability. Do not equate the smallest installment with the best choice.
- Every report must include the required educational-simulation disclaimer and the finance data's last-updated date.

## UX And Accessibility
- Match the Finwise visual direction: navy or dark slate primary, neutral background, functional green/amber/red statuses, and readable Indonesian copy.
- Use labels, keyboard-accessible controls, visible focus states, sufficient text contrast, and text status alongside color.
- Keep tables, navigation, charts, and forms usable from small mobile widths through desktop.
- Use progressive disclosure for finance concepts. Explain technical terms in plain Indonesian near the relevant result.

## Verification
- Test the specified 0% loan, flat-interest loan, affordability, DTI, and 0% annuity cases.
- Add boundary tests for empty inputs, invalid tenor, zero interest, and extreme numeric values.
- Verify the app through a local browser before completion, including mobile navigation, persistence, CSV export, printing, and deletion confirmation.

## References
- Official sources for links or verified regulatory information: https://www.ojk.go.id/, https://find.ojk.go.id/, https://www.bi.go.id/, and https://idebku.ojk.go.id/.
