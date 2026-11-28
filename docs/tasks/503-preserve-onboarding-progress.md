# 503 Preserve workspace onboarding progress when switching tabs

[Issue #503](https://github.com/Corely-AI/corely/issues/503) targets `development`.

Returning to `/onboarding` with a stale workspace list starts a background refresh. The route
guard now keeps the workspace creation form mounted during that refresh. First discovery and
explicit workspace selection still wait for the workspace list.

The router regression reproduced an unmounted step 2 before the fix and confirmed that the
step and entered fields survive the delayed request afterward. All 45 router tests and the web
and web-shared typechecks passed.

Local Chrome used a synthetic account and intercepted API responses. Simulated visibility events
started a delayed refresh while step 2 was filled. Back and Continue worked afterward. Screenshots
show the form while the request is pending in English on
[desktop (1366×900)](../frontend/images/onboarding-tab-return/desktop-en.png) and
[phone (390×844)](../frontend/images/onboarding-tab-return/phone-en.png).
