# CV Optimizer Browser Assistant

This unpacked Chrome/Edge Manifest V3 extension uses a locally imported
CV Optimizer application package to fill a small set of recognizable fields on
Greenhouse and Lever application pages.

## Install for local development

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `browser-extension` folder.
4. Open the extension side panel from the toolbar.
5. In CV Optimizer, prepare a batch, review the tailored CV and cover letter,
   then download the **Paket browser** JSON for the selected job.
6. Import that JSON in the extension panel, open the corresponding HTTPS
   Greenhouse or Lever application form, and choose **Isi field yang dikenali**.
7. After you manually submit the application, return to the CV Optimizer batch
   result and choose **Sudah submit — catat** to save its status and match score
   to the account tracker/dashboard.

The package contains personal CV information. It is read in the extension
panel and is not sent to CV Optimizer, another server, or an extension storage
area. Keep downloaded package files private and delete them when no longer
needed.

## Scope and limitations

- Supported hosts: `boards.greenhouse.io`, `job-boards.greenhouse.io`, and
  `jobs.lever.co`.
- It may fill email, phone, name, LinkedIn, location, and a field explicitly
  labeled **Cover Letter** when those fields are identifiable.
- Review every filled value. Never assume that a form field was correctly
  recognized.
- It does not upload a resume file. Download the tailored CV PDF or DOCX from
  CV Optimizer and attach it manually.
- It does not answer screening questions, choose legal/EEO/work-authorization
  options, handle CAPTCHA, or submit applications.
- Every application must be reviewed and submitted manually by the user.
- ATS pages change; unsupported or custom fields need to be completed manually.
