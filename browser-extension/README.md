# CV Optimizer Browser Assistant

This unpacked Chrome/Edge Manifest V3 extension uses a locally imported
CV Optimizer application package to fill a small set of recognizable fields
and attach the tailored PDF to supported Greenhouse and Lever application
pages. It never submits the form.

## Install for local development

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `browser-extension` folder.
4. Open the extension side panel from the toolbar.
5. In CV Optimizer, prepare a batch and review the tailored CV and cover letter.
   Download the browser package for one job or the batch package for several.
6. Import the JSON in the extension panel, choose a job if the package contains
   several, open that exact HTTPS Greenhouse or Lever application form, and
   choose **Isi field yang dikenali**.
7. Review every populated field and attached CV, complete unsupported questions
   yourself, then submit on the ATS page. Return to CV Optimizer and choose
   **Sudah submit — catat** only after the application was actually sent.

The package contains personal CV information. It is read in the extension
panel and is not sent to CV Optimizer, another server, or an extension storage
area. Keep downloaded package files private and delete them when no longer
needed.

## Scope and limitations

- Supported hosts: `boards.greenhouse.io`, `job-boards.greenhouse.io`, and
  `jobs.lever.co`.
- It may fill email, phone, name, LinkedIn, location, and a field explicitly
  labeled **Cover Letter** when those fields are identifiable. A supported CV
  file field may also receive the tailored PDF included in the package.
- The imported job URL must match the active ATS page before any fields are
  filled, to prevent using one job's materials on another listing.
- Review every filled value and attachment. Never assume that a field was
  correctly recognized.
- It does not answer screening questions, choose legal/EEO/work-authorization
  options, handle CAPTCHA, or submit applications. The extension does not
  click any submit button.
- Every application must be reviewed and submitted manually by the user.
- ATS pages change; unsupported or custom fields need to be completed manually.
