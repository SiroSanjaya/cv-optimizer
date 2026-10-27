(() => {
  const visible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0;
  };

  const fields = () => Array.from(document.querySelectorAll("input, textarea"))
    .filter((element) => !element.disabled && !element.readOnly && visible(element));

  const description = (element) => {
    const id = element.id;
    const explicitLabel = id
      ? Array.from(document.querySelectorAll("label[for]"))
        .find((label) => label.htmlFor === id)?.innerText
      : "";
    const wrappingLabel = element.closest("label")?.innerText ?? "";
    return [
      explicitLabel,
      wrappingLabel,
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.id,
    ].filter(Boolean).join(" ").toLowerCase().replace(/[_-]+/g, " ");
  };

  const find = (allFields, pattern, types) => allFields.find((element) => {
    const type = element instanceof HTMLInputElement ? element.type : "textarea";
    return types.includes(type) && pattern.test(description(element));
  });

  const setValue = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) return false;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const setResumeFile = (data, form) => {
    const fileInput = Array.from(form.querySelectorAll('input[type="file"]'))
      .filter((element) => !element.disabled && visible(element))
      .find((element) => {
        const label = description(element);
        return /\b(resume|cv|curriculum vitae)\b/.test(label);
      });
    if (!fileInput || !data.resumePdf?.base64) return false;

    const binary = atob(data.resumePdf.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const file = new File([bytes], data.resumePdf.filename || "Resume.pdf", {
      type: data.resumePdf.mimeType || "application/pdf",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const fillApplication = (data) => {
    const targetUrl = new URL(data.job.url);
    const normalizePath = (pathname) =>
      pathname.replace(/\/apply\/?$/i, "").replace(/\/+$/, "") || "/";
    if (
      targetUrl.origin !== window.location.origin ||
      normalizePath(targetUrl.pathname) !== normalizePath(window.location.pathname)
    ) {
      return {
        filled: [],
        reason: "Paket ini untuk lowongan lain. Buka halaman ATS yang sesuai.",
      };
    }

    const personal = data.cv.personalInfo;
    const allFields = fields();
    const filled = [];
    const firstName = personal.name.trim().split(/\s+/)[0] ?? "";
    const lastName = personal.name.trim().split(/\s+/).slice(1).join(" ");

    const add = (label, element, value) => {
      if (element && value && setValue(element, value)) filled.push(label);
    };

    const email = find(allFields, /\bemail\b/, ["email", "text"]);
    add("Email", email, personal.email);

    const phone = find(allFields, /\b(phone|mobile|telephone)\b/, ["tel", "text"]);
    add("Phone", phone, personal.phone);

    const first = find(allFields, /\b(first|given)\s*name\b/, ["text"]);
    const last = find(allFields, /\b(last|family|sur)\s*name\b/, ["text"]);
    if (first && last) {
      add("First name", first, firstName);
      add("Last name", last, lastName);
    } else {
      const fullName = find(allFields, /\b(full|applicant|candidate)\s+name\b/, ["text"]) ??
        allFields.find((element) => {
          if (!(element instanceof HTMLInputElement) || element.type !== "text") return false;
          return /^(name|full.?name|applicant.?name)$/i.test(element.name) ||
            /^(name|full.?name|applicant.?name)$/i.test(element.id);
        });
      add("Name", fullName, personal.name);
    }

    const linkedin = find(allFields, /\blinked[\s_-]?in\b/, ["url", "text"]);
    add("LinkedIn", linkedin, personal.linkedin);

    const location = find(allFields, /\b(city|current location|location)\b/, ["text"]);
    add("Location", location, personal.location);

    const coverLetter = find(allFields, /\bcover letter\b/, ["textarea"]);
    add("Cover letter", coverLetter, data.coverLetter.content);

    const form = (email ?? phone ?? first ?? last ?? coverLetter)?.form ??
      document.querySelector("form");
    if (!form) {
      return { filled, reason: "Form lamaran tidak ditemukan." };
    }

    const resumeUploaded = setResumeFile(data, form);
    if (resumeUploaded) filled.push("Resume PDF");
    return { filled };
  };

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type !== "CV_OPTIMIZER_FILL") return false;

    const host = window.location.hostname;
    const supported =
      host === "boards.greenhouse.io" ||
      host === "job-boards.greenhouse.io" ||
      host === "jobs.lever.co";
    if (!supported) {
      respond({ ok: false, error: "Halaman ini bukan form Greenhouse atau Lever yang didukung." });
      return false;
    }

    try {
      const result = fillApplication(message.data);
      respond({
        ok: true,
        filled: result.filled,
        reason: result.filled.length
          ? "Field dikenali sudah diisi. Periksa semua data dan kirim lamaran sendiri."
          : result.reason || "Tidak ada field yang dikenali. Isi form secara manual.",
      });
    } catch {
      respond({ ok: false, error: "Form gagal diisi. Coba refresh halaman dan isi field secara manual." });
    }
    return false;
  });
})();
