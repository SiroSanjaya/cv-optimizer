const fileInput = document.querySelector("#package-file");
const summary = document.querySelector("#package-summary");
const jobPickerLabel = document.querySelector("#job-picker-label");
const jobPicker = document.querySelector("#job-picker");
const fillButton = document.querySelector("#fill-button");
const submitButton = document.querySelector("#submit-button");
const reviewConfirmation = document.querySelector("#review-confirmation");
const status = document.querySelector("#status");

let applications = [];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedJobUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (
      url.hostname === "boards.greenhouse.io" ||
      url.hostname === "job-boards.greenhouse.io"
    ) {
      return /^\/[^/]+\/jobs\/\d+(?:\/apply)?\/?$/i.test(url.pathname);
    }
    return url.hostname === "jobs.lever.co" &&
      /^\/[^/]+\/[a-f0-9-]+(?:\/apply)?\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function validApplication(value) {
  return isRecord(value) &&
    value.format === "cv-optimizer-application" &&
    value.version === 1 &&
    isRecord(value.job) &&
    typeof value.job.title === "string" &&
    typeof value.job.company === "string" &&
    typeof value.job.url === "string" &&
    isSupportedJobUrl(value.job.url) &&
    isRecord(value.cv) &&
    isRecord(value.cv.personalInfo) &&
    ["name", "email", "phone", "location", "linkedin"].every(
      (key) => typeof value.cv.personalInfo[key] === "string"
    ) &&
    isRecord(value.coverLetter) &&
    typeof value.coverLetter.content === "string" &&
    isRecord(value.resumePdf) &&
    typeof value.resumePdf.filename === "string" &&
    value.resumePdf.mimeType === "application/pdf" &&
    typeof value.resumePdf.base64 === "string";
}

function normalizeApplication(value) {
  if (validApplication(value)) return [value];
  if (
    !isRecord(value) ||
    value.format !== "cv-optimizer-application-batch" ||
    value.version !== 1 ||
    !Array.isArray(value.applications) ||
    value.applications.length === 0 ||
    value.applications.length > 100 ||
    !value.applications.every(validApplication)
  ) {
    throw new Error("Format paket lamaran CV Optimizer tidak didukung.");
  }
  return value.applications;
}

function selectedApplication() {
  return applications[Number(jobPicker.value)] ?? null;
}

function renderPackage() {
  const current = selectedApplication();
  if (!current) {
    summary.hidden = true;
    fillButton.disabled = true;
    submitButton.disabled = true;
    reviewConfirmation.disabled = true;
    reviewConfirmation.checked = false;
    reviewConfirmation.disabled = true;
    reviewConfirmation.checked = false;
    return;
  }

  summary.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `${current.job.title} — ${current.job.company}`;
  const location = document.createElement("div");
  location.textContent = current.job.location || "Lokasi tidak tersedia";
  const count = document.createElement("div");
  count.textContent = `${applications.length} paket tersedia`;
  summary.append(title, location, count);
  summary.hidden = false;
  jobPickerLabel.hidden = applications.length < 2;
  fillButton.disabled = false;
  reviewConfirmation.disabled = true;
  reviewConfirmation.checked = false;
  submitButton.disabled = true;
}

fileInput.addEventListener("change", async () => {
  applications = [];
  jobPicker.replaceChildren();
  fillButton.disabled = true;
  submitButton.disabled = true;
  jobPickerLabel.hidden = true;
  summary.hidden = true;

  const file = fileInput.files?.[0];
  if (!file) {
    status.textContent = "Belum ada paket lamaran.";
    return;
  }

  status.textContent = "Membaca paket...";
  try {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Ukuran paket melebihi batas 2 MB.");
    }
    applications = normalizeApplication(JSON.parse(await file.text()));
    applications.forEach((application, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${application.job.title} — ${application.job.company}`;
      jobPicker.append(option);
    });
    renderPackage();
    status.textContent = applications.length > 1
      ? "Paket dimuat lokal. Pilih lowongan dan buka form ATS yang sesuai."
      : "Paket dimuat lokal. Buka form ATS lowongan ini.";
  } catch (error) {
    applications = [];
    status.textContent = error instanceof Error
      ? error.message
      : "File paket tidak bisa dibaca.";
  }
});

jobPicker.addEventListener("change", renderPackage);

fillButton.addEventListener("click", async () => {
  const application = selectedApplication();
  if (!application) return;
  fillButton.disabled = true;
  status.textContent = "Memeriksa halaman ATS...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      throw new Error("Tidak dapat membaca tab aktif.");
    }
    const currentUrl = new URL(tab.url);
    const targetUrl = new URL(application.job.url);
    const normalizePath = (pathname) =>
      pathname.replace(/\/apply\/?$/i, "").replace(/\/+$/, "") || "/";
    if (
      currentUrl.protocol !== "https:" ||
      currentUrl.origin !== targetUrl.origin ||
      normalizePath(currentUrl.pathname) !== normalizePath(targetUrl.pathname)
    ) {
      throw new Error("Buka halaman ATS untuk lowongan yang dipilih terlebih dahulu.");
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "CV_OPTIMIZER_FILL",
      data: application,
    });
    if (!result?.ok) throw new Error(result?.error || "Form tidak dapat diisi.");

    status.textContent = result.filled.length
      ? `${result.reason} Terisi: ${result.filled.join(", ")}.`
      : result.reason || "Tidak ada field yang dikenali. Isi form secara manual.";
    if (result.ok) {
      reviewConfirmation.checked = false;
      reviewConfirmation.disabled = false;
      status.textContent += " Setelah memeriksa, aktifkan persetujuan review untuk membuka tombol kirim.";
    }
  } catch (error) {
    status.textContent = error instanceof Error
      ? `${error.message} Jika baru memasang extension, refresh tab form.`
      : "Gagal mengisi form. Refresh tab dan coba lagi.";
  } finally {
    fillButton.disabled = false;
  }
});

reviewConfirmation.addEventListener("change", () => {
  submitButton.disabled = !reviewConfirmation.checked;
});

submitButton.addEventListener("click", async () => {
  const application = selectedApplication();
  if (!application || !reviewConfirmation.checked) return;

  const confirmed = confirm(
    `Kirim lamaran ke ${application.job.company} untuk posisi ${application.job.title}? ` +
    "Ini hanya akan dikirim jika form lengkap dan tidak ada CAPTCHA."
  );
  if (!confirmed) return;

  submitButton.disabled = true;
  status.textContent = "Memeriksa kelengkapan form...";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("Tidak dapat membaca tab aktif.");

    const currentUrl = new URL(tab.url);
    const targetUrl = new URL(application.job.url);
    const normalizePath = (pathname) =>
      pathname.replace(/\/apply\/?$/i, "").replace(/\/+$/, "") || "/";
    if (
      currentUrl.protocol !== "https:" ||
      currentUrl.origin !== targetUrl.origin ||
      normalizePath(currentUrl.pathname) !== normalizePath(targetUrl.pathname)
    ) {
      throw new Error("Buka kembali halaman lowongan yang dipilih sebelum mengirim.");
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "CV_OPTIMIZER_SUBMIT",
      data: application,
      reviewConfirmed: true,
    });
    if (!result?.ok) throw new Error(result?.error || "Lamaran tidak dapat dikirim.");
    status.textContent = result.sent
      ? "Lamaran dikirim melalui tombol pengiriman pada form ATS. Kembalikan status menjadi Lamaran Terkirim hanya setelah konfirmasi situs."
      : "Lamaran belum dikirim.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Gagal mengirim lamaran.";
  } finally {
    submitButton.disabled = !reviewConfirmation.checked;
  }
});
