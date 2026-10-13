const fileInput = document.querySelector("#package-file");
const summary = document.querySelector("#package-summary");
const fillButton = document.querySelector("#fill-button");
const status = document.querySelector("#status");

let applicationPackage = null;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPackage(value) {
  return isRecord(value) &&
    value.format === "cv-optimizer-application" &&
    value.version === 1 &&
    isRecord(value.job) &&
    typeof value.job.title === "string" &&
    typeof value.job.company === "string" &&
    typeof value.job.url === "string" &&
    isRecord(value.cv) &&
    isRecord(value.cv.personalInfo) &&
    ["name", "email", "phone", "location", "linkedin"].every(
      (key) => typeof value.cv.personalInfo[key] === "string"
    ) &&
    isRecord(value.coverLetter) &&
    typeof value.coverLetter.content === "string";
}

fileInput.addEventListener("change", async () => {
  applicationPackage = null;
  fillButton.disabled = true;
  summary.hidden = true;
  status.textContent = "Membaca paket...";

  const file = fileInput.files?.[0];
  if (!file) {
    status.textContent = "Belum ada paket lamaran.";
    return;
  }

  try {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Ukuran paket melebihi batas 2 MB.");
    }
    const parsed = JSON.parse(await file.text());
    if (!validPackage(parsed)) {
      throw new Error("Format file bukan paket lamaran CV Optimizer yang didukung.");
    }
    applicationPackage = parsed;
    summary.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = `${parsed.job.title} — ${parsed.job.company}`;
    const location = document.createElement("div");
    location.textContent = parsed.job.location || "Lokasi tidak tersedia";
    summary.append(title, location);
    summary.hidden = false;
    fillButton.disabled = false;
    status.textContent = "Paket dimuat lokal. Buka form lamaran Greenhouse atau Lever.";
  } catch (error) {
    status.textContent = error instanceof Error
      ? error.message
      : "File paket tidak bisa dibaca.";
  }
});

fillButton.addEventListener("click", async () => {
  if (!applicationPackage) return;
  fillButton.disabled = true;
  status.textContent = "Mencari field yang didukung...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      throw new Error("Tidak dapat membaca tab aktif.");
    }
    const currentUrl = new URL(tab.url);
    const supportedHosts = new Set([
      "boards.greenhouse.io",
      "job-boards.greenhouse.io",
      "jobs.lever.co",
    ]);
    if (currentUrl.protocol !== "https:" || !supportedHosts.has(currentUrl.hostname)) {
      throw new Error("Buka halaman form HTTPS Greenhouse atau Lever terlebih dahulu.");
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "CV_OPTIMIZER_FILL",
      data: applicationPackage,
    });
    if (!result?.ok) throw new Error(result?.error || "Form tidak dapat diisi.");

    status.textContent = result.filled.length
      ? `Terisi: ${result.filled.join(", ")}. Periksa isinya, unggah CV secara manual, lalu submit sendiri.`
      : "Tidak ada field yang dikenali. Isi form secara manual dan review sebelum submit.";
  } catch (error) {
    status.textContent = error instanceof Error
      ? `${error.message} Jika baru memasang extension, refresh tab form.`
      : "Gagal mengisi form. Refresh tab dan coba lagi.";
  } finally {
    fillButton.disabled = false;
  }
});
