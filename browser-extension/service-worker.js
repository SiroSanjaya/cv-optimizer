chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

const supportedHosts = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
]);

function isSupportedJobUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !supportedHosts.has(url.hostname)) return false;
    if (url.hostname === "jobs.lever.co") {
      return /^\/[^/]+\/[a-f0-9-]+(?:\/apply)?\/?$/i.test(url.pathname);
    }
    return /^\/[^/]+\/jobs\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Halaman ATS tidak selesai dimuat."));
    }, 30_000);
    const onUpdated = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function reportProgress(sendResponse, completed, total, current) {
  chrome.runtime.sendMessage({
    type: "CV_OPTIMIZER_BATCH_PROGRESS",
    completed,
    total,
    current,
  }).catch(() => {});
}

async function runApprovedBatch(applications, sendResponse) {
  const results = [];
  const eligible = applications.filter((item) =>
    isSupportedJobUrl(item.job.url) &&
    typeof item.resumePdf?.base64 === "string" &&
    item.resumePdf.base64.length > 0
  );

  for (const item of applications) {
    if (!eligible.includes(item)) {
      results.push({
        job: item.job,
        status: "skipped",
        reason: "Link ATS langsung tidak didukung atau CV PDF tidak tersedia.",
      });
    }
  }

  if (eligible.length === 0) return { results };

  let tab = await chrome.tabs.create({ url: eligible[0].job.url, active: true });
  if (!tab.id) throw new Error("Tab ATS tidak dapat dibuka.");

  try {
    for (let index = 0; index < eligible.length; index += 1) {
      const item = eligible[index];
      reportProgress(sendResponse, index, eligible.length, `${item.job.title} — ${item.job.company}`);

      if (index > 0) {
        await chrome.tabs.update(tab.id, { url: item.job.url, active: true });
      }
      await waitForTabLoad(tab.id);

      let result;
      try {
        result = await chrome.tabs.sendMessage(tab.id, {
          type: "CV_OPTIMIZER_FILL",
          data: item,
        });
      } catch {
        result = {
          ok: false,
          submitted: false,
          reason: "Extension tidak dapat membaca form. Perlu diperiksa manual.",
        };
      }

      const status = result?.submitted === true
        ? "submitted"
        : result?.ok === false
          ? "failed"
          : "needs_manual_review";
      results.push({
        job: item.job,
        status,
        submittedAt: status === "submitted" ? new Date().toISOString() : null,
        reason: result?.reason || result?.error || (result?.filled?.length
          ? `Field terisi: ${result.filled.join(", ")}`
          : "Form belum dikirim."),
      });
      reportProgress(sendResponse, index + 1, eligible.length, `${item.job.title} — ${item.job.company}`);
    }
  } finally {
    await chrome.tabs.update(tab.id, { active: false }).catch(() => {});
  }
  return { results };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CV_OPTIMIZER_START_BATCH") return false;
  if (!Array.isArray(message.applications) || message.applications.length === 0) {
    sendResponse({ ok: false, error: "Batch lamaran kosong." });
    return false;
  }
  if (message.applications.length > 100) {
    sendResponse({ ok: false, error: "Batch melebihi batas 100 lamaran." });
    return false;
  }
  runApprovedBatch(message.applications, sendResponse)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Batch lamaran gagal dijalankan.",
    }));
  return true;
});
